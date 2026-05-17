import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { BLOOM_RADIUS, BLOOM_STRENGTH, BLOOM_THRESHOLD } from "./sceneConfig";

/**
 * Two-pass postprocessing pipeline:
 *
 *   1. **Debris pass** — camera renders only layer 0 (the debris cloud), clearing
 *      the colour buffer. This is the "background" of the frame.
 *   2. **Wordmark pass** — camera renders only layer 1 (the per-letter meshes),
 *      with the depth buffer cleared so the wordmark always wins the depth test
 *      against the debris. Effectively makes the logo a "foreground layer" that
 *      can never be occluded by a debris piece.
 *   3. **Bloom** — `UnrealBloomPass`, disabled by default. Enabled only when the
 *      neon finish is active (the neon material's HDR emissive triggers it; the
 *      other finishes don't exceed the threshold).
 *   4. **Output** — tone mapping + colour space conversion to sRGB.
 */

/**
 * A RenderPass that temporarily restricts the camera to a single layer before
 * delegating to `RenderPass.render`. Used to do the two-layer split above
 * without juggling layer state in the animate loop.
 */
class LayeredRenderPass extends RenderPass {
  private readonly heroLayer: number;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    layer: number,
    clearColor: boolean,
    clearDepth: boolean,
  ) {
    super(scene, camera);
    this.heroLayer = layer;
    this.clear = clearColor;
    this.clearDepth = clearDepth;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    const cam = this.camera as THREE.PerspectiveCamera;
    const previousMask = cam.layers.mask;
    cam.layers.set(this.heroLayer);
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    cam.layers.mask = previousMask;
  }
}

/** Composer + bloom pass pair, returned to the caller for resize and toggle. */
export type ComposerBundle = {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
};

/**
 * Build the composer pipeline for the hero.
 *
 * @param pixelRatio must mirror whatever `renderer.setPixelRatio()` was called
 *   with — passing a mismatched value (e.g. reading `window.devicePixelRatio`
 *   here while the renderer is locked to 1× for the mobile perf branch)
 *   produces a blurry or mis-sized output.
 *
 * The caller is responsible for:
 *   • calling `composer.setSize(w, h)` on resize
 *   • setting `bloomPass.enabled` based on the active finish
 *   • calling `composer.dispose()` on unmount
 */
export function setupComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  pixelRatio: number,
): ComposerBundle {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);

  // Debris layer — clears the frame.
  composer.addPass(new LayeredRenderPass(scene, camera, 0, true, false));
  // Wordmark layer — keeps colour, clears depth, drawn on top.
  composer.addPass(new LayeredRenderPass(scene, camera, 1, false, true));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  bloomPass.enabled = false; // toggled on when the neon finish is selected
  composer.addPass(bloomPass);

  composer.addPass(new OutputPass());

  return { composer, bloomPass };
}
