import * as THREE from "three";
import { FAR } from "./sceneConfig";

/**
 * "ASCII" render mode — re-renders the live scene as character art.
 *
 * It's a post-process, which is its great virtue: it samples a rendered image
 * of whatever the scene is currently doing, so it composes with the breathing,
 * the cursor parallax, the click-scatter, and the phrase-dissolve swarm for
 * free — none of those need to know ASCII exists.
 *
 * Two ideas keep it reading as 3-D instead of a flat dot-screen:
 *
 *   1. **Depth-banded glyph size.** The scene's depth buffer rides along in the
 *      render target. The quad draws in three passes — far / mid / near — each
 *      with a different character cell size (small / medium / large). Character
 *      SIZE is the strongest depth cue this medium has. The mid band's
 *      boundaries track the camera→wordmark distance every frame, so the
 *      wordmark always sits inside ONE band — a static seam slicing a letter
 *      between two glyph scales is what makes naive multi-scale ASCII mush.
 *
 *   2. **Luminance ramp, not threshold.** Glyph density follows shading
 *      (dark = dense `@`, light = sparse `.`) lifted by a mild nearness boost,
 *      so the chrome's lit faces keep their gradient and read as volume.
 *
 * The host owns the hybrid "solid faces" overlay (it needs the letter meshes
 * and materials); this module only owns the RT + atlas + quad.
 */

const ASCII_CHARS = " .:-=+*#%@";

/** Depth bands: cell size (CSS px) + which camera-distance slice each owns.
 *  min/max are filled in per frame, centred on the wordmark (see `render`). */
const BANDS = [
  { cell: 6, min: 0, max: 0 }, // far — drawn first
  { cell: 9, min: 0, max: 0 }, // mid — owns the wordmark
  { cell: 15, min: 0, max: 0 }, // near
];

export type AsciiPass = {
  /** Render the scene as ASCII to the canvas. `drawScene` must draw the world
   *  into the currently-bound target (the host's normal scene draw, single
   *  enable-all pass so the depth buffer is physically correct). `wordDist` is
   *  the camera→wordmark distance (bands centre on it). `mix` (0..1) drives the
   *  boot type-in / compile dissolve. */
  render: (
    renderer: THREE.WebGLRenderer,
    drawScene: () => void,
    wordDist: number,
    mix: number,
    /** Clear the canvas before the glyph passes (steady ascii). Pass false to
     *  overlay glyphs onto whatever is already on the canvas — used by the boot
     *  compile, where solid chrome is the backdrop the cells dissolve to reveal. */
    clearCanvas?: boolean,
  ) => void;
  setSize: (w: number, h: number, dpr: number) => void;
  /** Recolour the glyphs (follows the hero tint). */
  setColor: (hex: string) => void;
  dispose: () => void;
};

/** Build the glyph atlas: each character rendered white on transparent into a
 *  horizontal strip, sampled by the quad shader. */
function buildAtlas(): THREE.CanvasTexture {
  const cell = 64;
  const c = document.createElement("canvas");
  c.width = cell * ASCII_CHARS.length;
  c.height = cell;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, cell);
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${cell * 0.8}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < ASCII_CHARS.length; i++) {
    ctx.fillText(ASCII_CHARS[i], i * cell + cell / 2, cell / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function buildAsciiPass(
  width: number,
  height: number,
  dpr: number,
  inkHex: string,
): AsciiPass {
  const atlas = buildAtlas();

  const rtW = Math.floor(width * dpr);
  const rtH = Math.floor(height * dpr);
  const sceneRT = new THREE.WebGLRenderTarget(rtW, rtH, {
    depthTexture: new THREE.DepthTexture(rtW, rtH),
  });

  const uniforms = {
    tScene: { value: sceneRT.texture },
    tDepth: { value: sceneRT.depthTexture },
    tAtlas: { value: atlas },
    uNear: { value: 0.1 },
    uFar: { value: FAR },
    uResolution: { value: new THREE.Vector2(rtW, rtH) },
    uCell: { value: 9 * dpr },
    uGlyphs: { value: ASCII_CHARS.length },
    uInk: { value: new THREE.Color(inkHex) },
    uMix: { value: 1 },
    uBandMin: { value: 0 },
    uBandMax: { value: 1e9 },
  };

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    vertexShader: /* glsl */ `
      void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      uniform sampler2D tDepth;
      uniform sampler2D tAtlas;
      uniform float uNear;
      uniform float uFar;
      uniform vec2 uResolution;
      uniform float uCell;
      uniform float uGlyphs;
      uniform vec3 uInk;
      uniform float uMix;
      uniform float uBandMin;
      uniform float uBandMax;
      void main() {
        vec2 frag = gl_FragCoord.xy;
        vec2 cellOrigin = floor(frag / uCell) * uCell;
        // Per-cell boot/compile dissolve: stable hash + left→right sweep,
        // normalized so it stays coherent across the band cell sizes.
        vec2 cellN = cellOrigin / uResolution;
        float h = fract(sin(dot(cellN, vec2(12.9898, 78.233))) * 43758.5453);
        float order = 0.55 * cellN.x + 0.45 * h;
        if (order > uMix) discard;

        vec2 sampleUv = (cellOrigin + uCell * 0.5) / uResolution;
        vec4 scene = texture2D(tScene, sampleUv);

        // Depth → view distance (standard perspective linearization). Each draw
        // owns one band, so the wordmark always renders at one glyph scale.
        float d = texture2D(tDepth, sampleUv).x;
        float viewZ = (uNear * uFar) / ((uFar - uNear) * d - uFar);
        float dist = -viewZ;
        if (dist < uBandMin || dist >= uBandMax) discard;
        float nearness = clamp(1.0 - (dist - 400.0) / 3400.0, 0.0, 1.0);

        float lum = dot(scene.rgb, vec3(0.299, 0.587, 0.114));
        // Power curve keeps the shading gradient (only true black hits '@');
        // mild nearness boost — glyph SIZE carries most of the depth.
        float shade = pow(clamp(1.0 - lum, 0.0, 1.0), 0.8);
        float ink = shade * (0.65 + 0.35 * nearness) * scene.a;
        float idx = floor(clamp(ink, 0.0, 0.999) * uGlyphs);

        vec2 inCell = (frag - cellOrigin) / uCell;
        vec2 atlasUv = vec2((idx + inCell.x) / uGlyphs, inCell.y);
        float g = texture2D(tAtlas, atlasUv).a;
        if (g < 0.22) discard;
        gl_FragColor = vec4(uInk, g);
      }
    `,
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat));

  return {
    render(renderer, drawScene, wordDist, mix, clearCanvas = true) {
      // 1. Scene → RT (host draws; single enable-all pass for correct depth).
      renderer.setRenderTarget(sceneRT);
      renderer.clear();
      drawScene();
      renderer.setRenderTarget(null);
      // Clear for steady ascii; keep the existing canvas (solid backdrop) when
      // the boot is compiling cells away to reveal the chrome underneath.
      if (clearCanvas) renderer.clear();

      // 2. Re-centre the mid band on the wordmark, then draw far → near.
      const nearEdge = Math.max(250, wordDist - 450);
      const farEdge = wordDist + 550;
      BANDS[0].min = farEdge;
      BANDS[0].max = 1e9;
      BANDS[1].min = nearEdge;
      BANDS[1].max = farEdge;
      BANDS[2].min = 0;
      BANDS[2].max = nearEdge;

      uniforms.uMix.value = mix;
      const dpr = renderer.getPixelRatio();
      renderer.autoClear = false;
      for (const band of BANDS) {
        uniforms.uCell.value = band.cell * dpr;
        uniforms.uBandMin.value = band.min;
        uniforms.uBandMax.value = band.max;
        renderer.render(quadScene, quadCam);
      }
      renderer.autoClear = true;
    },
    setSize(w, h, dpr) {
      const nw = Math.floor(w * dpr);
      const nh = Math.floor(h * dpr);
      sceneRT.setSize(nw, nh);
      uniforms.uResolution.value.set(nw, nh);
    },
    setColor(hex) {
      uniforms.uInk.value.set(hex);
    },
    dispose() {
      sceneRT.dispose();
      atlas.dispose();
      quadMat.dispose();
    },
  };
}
