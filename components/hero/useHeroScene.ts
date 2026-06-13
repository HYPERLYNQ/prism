import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import { FontLoader, type Font } from "three/addons/loaders/FontLoader.js";
import {
  DEFAULT_FINISH,
  PHRASES,
  SWATCHES,
  type MatName,
  type Swatch,
} from "@/lib/looks";
import {
  BASE_Z,
  BREATH_AMP,
  CAM_FOLLOW,
  DEBRIS_TOTAL,
  DEBRIS_TOTAL_MOBILE,
  FAR,
  FOV_DEG,
  LOOK_TARGET,
  MAX_DT,
  MOBILE_BREAKPOINT,
  MOUSE_AMP,
  OPACITY_LERP,
  PHASE_DISSOLVE_DUR,
  PHASE_IDLE_DUR,
  PHASE_REFORM_DUR,
  PHASE_TRAVEL_DUR,
  REGROUP_DUR,
  REGROUP_SPRING,
  SCATTER_CLAMP,
  SCATTER_HOLD,
  SCATTER_VEL_MIN,
  SCATTER_VEL_SPAN,
  VEL_DAMP,
  computeBaseZ,
} from "./sceneConfig";
import { buildEnvScene } from "./sceneEnv";
import { makeNeonDebrisMaterial, makePreset } from "./sceneMaterials";
import { placeDebris } from "./sceneDebris";
import {
  applyPhraseSample,
  buildParticleSystem,
  disposeParticleSystem,
  endReform,
  samplePhrase,
  setParticleMaterial,
  startDissolve,
  startReform,
  updateParticles,
  type ParticlePhase,
  type PhraseSample,
} from "./sceneParticles";
import { attachPhraseToRoot, buildPhrase } from "./sceneWordmark";
import { setupComposer } from "./sceneComposer";
import {
  applyMinPointSize,
  buildPointsLayer,
  makeDotTexture,
  rebakeDebrisPoints,
  setDebrisPointsColor,
  setHeroPointsColor,
  type PointsLayer,
} from "./scenePoints";
import { buildAsciiPass } from "./sceneAscii";
import { buildGravityField, updateGravity, type GravityField } from "./sceneGravity";
import type { RenderMode, SceneApi } from "./sceneTypes";

/**
 * The single useEffect that owns the entire three.js scene for the hero.
 *
 * Lifecycle:
 *   1. Create renderer / scene / camera / env IBL / composer.
 *   2. Build initial materials (hero + debris) from the default tints.
 *   3. Place the debris cloud.
 *   4. Asynchronously load the font, then build every phrase as per-letter meshes
 *      and call `onReady()` so the React layer can fade the UI in.
 *   5. Wire pointer / touch / resize listeners.
 *   6. Expose imperative setters via `apiRef` so the picker UI can mutate the scene.
 *   7. Start the animation loop.
 *   8. On unmount, dispose every GPU resource and detach every listener.
 *
 * The hook returns nothing — the scene's only outward surface is the canvas the
 * renderer draws into (provided by `canvasRef`) and the imperative API on `apiRef`.
 */
export function useHeroScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  apiRef: RefObject<SceneApi | null>,
  onReady: () => void,
  onFirstMove: () => void,
  onError: () => void,
  bootRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* ── core: renderer, scene, camera, env IBL ─────────────────── */
    // Mobile perf branch — narrow viewports use a lower pixel ratio and fewer debris
    // pieces. The screen is small enough that the visual difference is negligible
    // but the GPU savings are big (especially on phone iGPUs).
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const debrisCount = isMobile ? DEBRIS_TOTAL_MOBILE : DEBRIS_TOTAL;

    // Responsive camera distance — pulled back proportionally on narrow viewports
    // so the wordmark always fits in the frame with margin instead of clipping.
    let baseZ = computeBaseZ(window.innerWidth);
    /**
     * Cursor amplitude — scales up with the camera distance.
     *
     * The visual parallax angle is `atan(camera_x / camera_z)`. On a narrow
     * viewport the camera is pulled back (larger Z) and a swipe across the
     * (small) screen produces a tiny X delta, so the parallax effectively
     * collapses. Scaling the amplitude by `baseZ / BASE_Z` keeps the angular
     * swing roughly constant — same drama on phone as on desktop.
     */
    let mouseAmp = MOUSE_AMP * (baseZ / BASE_Z);

    // WebGL can be unavailable (locked-down browsers, blocklisted GPUs, software
    // rendering disabled). The renderer constructor throws when it can't acquire
    // a context — catch it and signal the React layer to show a DOM fallback
    // hero instead of leaving a blank canvas as the first impression.
    //
    // We deliberately do NOT pass `powerPreference: "high-performance"`. That
    // flag asks the browser for the discrete GPU, and Chrome on Apple Silicon
    // Macs running macOS Tahoe 26.1+ refuses the request (no dGPU exists on
    // M-series chips, only the integrated Apple GPU) — the context creation
    // fails outright and a top-of-line M3 Pro user falls to the static
    // fallback. Leaving powerPreference unset lets the browser pick "default"
    // for desktops and "low-power" on battery for laptops, which is what we
    // want anyway for a portfolio hero (no shader-heavy postprocessing in this
    // scene that would benefit from a forced dGPU).
    //
    // A multi-tier cascade on the same canvas would NOT help here: the HTML
    // spec caches the WebGL context on the canvas, so a second
    // `new WebGLRenderer({canvas, ...newAttrs})` would silently get the
    // already-created context with the ORIGINAL attributes. The only way to
    // genuinely retry with different attrs is to replace the canvas DOM node
    // — heavy and out of scope for this fix. We log the failure with full
    // diagnostics so future production failures are triageable.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: window.innerWidth < 1920,
      });
    } catch (err) {
      const ua =
        typeof navigator !== "undefined" ? navigator.userAgent : "n/a";
      console.error(
        `[useHeroScene] WebGL renderer init failed — showing static fallback.\n` +
          `  three.js: r${THREE.REVISION}\n` +
          `  userAgent: ${ua}\n` +
          `  error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
      );
      onError();
      return;
    }
    // Cap device pixel ratio. Desktop: 1.75 (not 2) — on high-DPI displays a 2×
    // cap renders ~30% more pixels every frame for a barely-perceptible sharpness
    // gain; 1.75 keeps the chrome crisp while easing GPU fill-rate / heat.
    // Mobile: cap at 2 (was 1). DPR-1 on a 2.5–3× phone screen rendered the
    // wordmark + debris at a quarter of the panel's native resolution — visibly
    // pixelated. A small phone viewport at DPR 2 is still a modest pixel count
    // (~1.3 MP), so the sharpness win comes cheap.
    const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 2 : 1.75);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      FOV_DEG,
      window.innerWidth / window.innerHeight,
      0.1,
      FAR,
    );
    camera.position.set(-1.5 * FAR, 0, baseZ); // off-screen left → big swoop in on load
    const lookTarget = new THREE.Vector3(...LOOK_TARGET);

    const pmrem = new THREE.PMREMGenerator(renderer);
    // Base studio env — unchanged from the original, shared by every finish so
    // the default look is preserved exactly.
    const envRenderTarget = pmrem.fromScene(buildEnvScene(), 0.02);
    scene.environment = envRenderTarget.texture;

    // A SECOND env, identical plus three HDR bars dead ahead, used ONLY by the
    // ASCII hybrid's mirror letter-faces (assigned to faceMaterial.envMap
    // below). The shared studio env puts its key light at the SIDES, leaving a
    // gap straight ahead (+z) where camera-facing surfaces reflect — so the
    // mirror faces would read flat grey without it. Kept off scene.environment
    // so it never brightens the default chrome wordmark.
    const faceEnvScene = buildEnvScene();
    const addMirrorBar = (y: number, w: number, h: number, intensity: number) => {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(intensity, intensity, intensity * 1.04),
          side: THREE.DoubleSide,
        }),
      );
      bar.position.set(0, y, 9);
      bar.lookAt(0, 0, 0);
      faceEnvScene.add(bar);
    };
    addMirrorBar(4.2, 14, 1.1, 5.0);
    addMirrorBar(0.6, 14, 0.5, 2.6);
    addMirrorBar(-2.8, 14, 1.6, 3.8);
    const faceEnvRenderTarget = pmrem.fromScene(faceEnvScene, 0.02);

    /* ── postprocessing ────────────────────────────────────────── */
    const { composer, bloomPass } = setupComposer(renderer, scene, camera, pixelRatio);

    /* ── materials ─────────────────────────────────────────────── */
    // The default bg lives in CSS as the initial `--bg` value; we don't need to track
    // it in the scene closure since nothing in the three.js world reads it.
    // `ink` is always present in SWATCHES, so the lookup can't miss; the literal
    // is a belt-and-suspenders fallback.
    const inkHex = SWATCHES.find((s) => s.name === "ink")?.hex ?? "#15171C";
    let heroTintHex = inkHex;
    let debrisTintHex = inkHex;
    let matName: MatName = DEFAULT_FINISH;
    // Current background hex — tracked so the ASCII glyph colour can stay legible
    // against whatever bg the picker selects. Defaults to the cream `--bg`.
    let bgHex = "#FAFAF7";

    /** sRGB channels [0..1] of a hex colour. */
    const srgbOf = (hex: string): [number, number, number] => {
      const h = hex.replace("#", "");
      return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
      ];
    };
    /** Perceptual (sRGB) luminance, 0 dark … 1 light, of a hex colour. From the
     *  sRGB bytes directly — NOT via THREE.Color, whose .r/.g/.b are LINEAR under
     *  colour management. Linear compresses mid-tones (gold-leaf reads 0.37 linear
     *  vs 0.62 perceptual), which skewed this contrast test and let low-contrast
     *  tints like white-on-gold slip through as "legible". */
    const lumOf = (hex: string) => {
      const [r, g, b] = srgbOf(hex);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    /**
     * Legible colour for a flat-coloured overlay (ASCII glyphs, point clouds)
     * tinted `tintHex` over the current page bg. A *saturated* tint that also
     * clears the bg by a solid luminance margin is a deliberate, readable colour
     * pick — keep it. Everything else (neutral white/grey/ink tints, or a colour
     * that's too close to the bg) falls back to WHITE on any colourful or dark
     * bg, and BLACK only on a light *neutral* bg (grey / white / off-white) where
     * white would vanish. So the dots read white over every colour and only turn
     * to ink against greys. The solid chrome render doesn't need this.
     */
    const INK_DARK = "#15171C";
    const INK_LIGHT = "#F4F2EC";
    const pickContrastInk = (tintHex: string) => {
      const bgL = lumOf(bgHex);
      const tint = srgbOf(tintHex);
      const tintChroma = Math.max(...tint) - Math.min(...tint);
      if (tintChroma > 0.12 && Math.abs(lumOf(tintHex) - bgL) > 0.45) return tintHex;
      const bg = srgbOf(bgHex);
      const bgChroma = Math.max(...bg) - Math.min(...bg);
      const lightNeutralBg = bgChroma < 0.12 && bgL > 0.5;
      return lightNeutralBg ? INK_DARK : INK_LIGHT;
    };

    let heroMaterial = makePreset(matName, heroTintHex);
    heroMaterial.transparent = true;
    heroMaterial.opacity = 0;
    let debrisMaterial = makePreset(matName, debrisTintHex);
    // Transparent so the boot/compile crossfade can fade the debris in with the
    // wordmark. At opacity 1 (the steady state) this renders identically to an
    // opaque material — depth is still written — so the default look is unchanged.
    debrisMaterial.transparent = true;

    // Particle material: a parallel always-opaque clone of the hero finish.
    // Particles share the picked finish + colour with the wordmark, but stay
    // opaque so they don't fade with the letter dissolve envelope (they ARE
    // the dissolve — the letters are what fade).
    let particleMaterial = makePreset(matName, heroTintHex);

    // ASCII hybrid overlay materials. `faceMaterial` is bright mirror chrome —
    // the readable letter CAPS render solid on top of the ASCII body. `sideHide`
    // is a no-paint material the overlay puts on the extrude SIDES so they stay
    // ASCII (the cap pass draws nothing for them, letting the character art
    // underneath show through).
    const faceMaterial = makePreset("chrome", "#c9cdd6");
    faceMaterial.transparent = true;
    // Mirror faces reflect the bars-augmented env (not the scene's), so the
    // reflections roll across them without touching the default chrome look.
    faceMaterial.envMap = faceEnvRenderTarget.texture;
    const sideHide = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    // ASCII render mode — a depth-aware post-process. Built upfront (only needs
    // dimensions); the render loop routes through it when renderMode==="ascii".
    const asciiPass = buildAsciiPass(
      window.innerWidth,
      window.innerHeight,
      pixelRatio,
      pickContrastInk(heroTintHex),
    );

    /* ── debris cloud ──────────────────────────────────────────── */
    const debrisGroup = new THREE.Group();
    scene.add(debrisGroup);
    const cameraRest = new THREE.Vector3(0, 0, baseZ);
    const debrisMeshes = placeDebris(debrisGroup, debrisMaterial, cameraRest, debrisCount);

    /* ── wordmark scaffolding (populated after the font loads) ──── */
    const wordRoot = new THREE.Group();
    scene.add(wordRoot);
    const phraseLetterMeshes: THREE.Mesh[][] = [];
    // Cached particle layout per phrase — computed once at font load, reused on
    // every transition (see samplePhrase). Indexed parallel to phraseLetterMeshes.
    const phraseSamples: PhraseSample[] = [];

    /* ── particle system (phrase dissolve / reform) ─────────────── */
    // InstancedMesh of small chrome shards that ARE the phrase transition.
    // Sits in its own group parallel to wordRoot, gets the same breathing
    // rotation copied to it each frame so it tracks the wordmark.
    const particles = buildParticleSystem(particleMaterial);
    scene.add(particles.group);

    // Dissolve-swarm POINTS twin — in points mode the phrase transition should
    // disperse as dots too (not solid chrome shards). A Points object reads the
    // particle system's live `cur` buffer directly (same memory updateParticles
    // mutates), parented to the swarm group so it shares the breathing tilt.
    // Shown only while the solid swarm is active; the solid mesh is suppressed
    // via colorWrite/depthWrite in points mode (see the render-mode block).
    const swarmDotTex = makeDotTexture();
    const swarmPointsMat = new THREE.PointsMaterial({
      color: new THREE.Color(heroTintHex),
      size: 4.0,
      map: swarmDotTex,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    // Match the wordmark twins: floor the far tail so the dissolving cloud
    // doesn't shrink to nothing at the parallax extremes either.
    applyMinPointSize(swarmPointsMat, 1.8 * pixelRatio);
    const swarmPointsGeo = new THREE.BufferGeometry();
    swarmPointsGeo.setAttribute("position", new THREE.BufferAttribute(particles.cur, 3));
    const swarmPoints = new THREE.Points(swarmPointsGeo, swarmPointsMat);
    swarmPoints.layers.set(1); // same layer as the wordmark + solid swarm
    swarmPoints.visible = false;
    swarmPoints.frustumCulled = false; // moving cloud — don't pop on a stale bounds test
    particles.group.add(swarmPoints);

    let font: Font | null = null;
    let sceneReady = false;
    let phraseIndex = 0;
    /** Time within the current phase of the dissolve/reform machine. */
    let phaseClock = 0;
    /** Current phase. `IDLE` = letters solid, swarm hidden; the three
     *  ParticlePhase values cover the transition. */
    let phraseTransitionPhase: "IDLE" | ParticlePhase = "IDLE";
    let phraseOpacity = 0;

    /* ── material-swap helpers (used by the imperative API setters) ── */
    /** Rebuild the hero material with the current finish + hero-tint, swap into every letter mesh.
     *  Also rebuilds the particle-system material (always-opaque clone of the same recipe) so
     *  particles pick up the new finish / colour. */
    function rebuildHero(): void {
      const next = makePreset(matName, heroTintHex);
      next.transparent = true;
      next.opacity = heroMaterial.opacity;
      const prev = heroMaterial;
      heroMaterial = next;
      // Both geometry groups (caps + sides) share the material in every mode
      // except the ASCII hybrid overlay, which swaps them transiently.
      for (const meshes of phraseLetterMeshes)
        for (const m of meshes) m.material = [heroMaterial, heroMaterial];
      prev.dispose();

      const prevPart = particleMaterial;
      particleMaterial = makePreset(matName, heroTintHex);
      setParticleMaterial(particles, particleMaterial);
      prevPart.dispose();
    }
    /**
     * Rebuild the debris material with the current finish + debris-tint, swap into
     * every instanced mesh. For the neon finish the debris uses the dim variant so
     * only the wordmark triggers the bloom halo.
     */
    function rebuildDebris(): void {
      const prev = debrisMaterial;
      debrisMaterial = matName === "neon"
        ? makeNeonDebrisMaterial(debrisTintHex)
        : makePreset(matName, debrisTintHex);
      debrisMaterial.transparent = true; // see note at creation (crossfade)
      for (const mesh of debrisMeshes) mesh.material = debrisMaterial;
      prev.dispose();
    }
    /**
     * Points render mode is surface-sampled (a chunky synchronous pass that
     * builds dot clouds for every letter of every phrase + every debris
     * instance). Built LAZILY on first use — never on load — so the ~70k-sample
     * pass can't stall a frame during the ASCII boot animation. The one-time
     * hitch lands on the user's first `points` click instead, where it reads
     * as the mode loading rather than the intro stuttering.
     */
    function buildPointsIfNeeded(): void {
      if (pointsLayer || !sceneReady || phraseLetterMeshes.length === 0) return;
      pointsLayer = buildPointsLayer(
        phraseLetterMeshes,
        debrisMeshes,
        pickContrastInk(heroTintHex),
        pickContrastInk(debrisTintHex),
        pixelRatio,
      );
      debrisGroup.add(pointsLayer.debrisPoints);
    }

    /* ── scene-console state (render mode + physics) ───────────── */
    // Set via the imperative API; read by the render loop and the per-mode
    // modules. `solid` is the default chrome render.
    let renderMode: RenderMode = "solid";
    let gravityOn = false;
    let sloMoOn = false;
    // ASCII glyph-cell visibility (0 = none, 1 = all). Eased toward 1 while
    // ascii mode is active so toggling it on plays the type-in dissolve; the
    // boot sequence drives it specially on first load.
    let asciiMix = 0;
    // Solid-render opacity for the boot/compile crossfade (1 = full solid,
    // 0 = fully ascii/hidden). Set to 0 when the boot arms; eased to 1 as it
    // compiles. The ascii RT render always samples at FULL opacity regardless,
    // so the character art stays crisp while the solid backdrop fades in.
    let solidMix = 1;
    // First-load ASCII boot — the hero types itself in as characters, holds,
    // then compiles to solid chrome. `bootActive` is true from the moment the
    // boot arms until the compile fully settles; `bootClock` advances the whole
    // time. The per-frame `booting` (type-in + hold window) is derived from
    // them in the loop. The boot forces the ascii render path until it settles.
    let bootActive = false;
    let bootClock = 0;
    const BOOT_TYPE = 1.0; // asciiMix 0→1 (cells type in, left→right sweep)
    const BOOT_HOLD = 2.4; // full-ascii hold ends here; the compile dissolve begins
    // After the hold, `booting` flips false and asciiMix eases toward 0 via the
    // same exponential the manual toggle uses — an open-ended dissolve (no hard
    // end), exactly like the prototype. `bootCompiling` stays true through it.
    // Built lazily at font load (needs the phrase letter meshes). Null until then.
    let pointsLayer: PointsLayer | null = null;
    // Debris gravity field — snapshots every instance's resting matrix so the
    // debris can fall and spring home. `settled` tracks whether the field is
    // fully home so the loop can stop stepping it and resume breathing.
    // `dbBreath` (0..1) eases the debris breathing amplitude to 0 while gravity
    // is engaged so pieces fall along world-down, not the 17° breathing tilt.
    const gravityField: GravityField = buildGravityField(debrisMeshes);
    let gravitySettled = true;
    let dbBreath = 1;

    /* ── scatter (click-the-wordmark interaction) ──────────────── */
    type Mode = "idle" | "scatter" | "regroup";
    let mode: Mode = "idle";
    let scatterClock = 0;

    const raycaster = new THREE.Raycaster();
    raycaster.layers.enableAll(); // wordmark lives on layer 1; default raycaster tests layer 0 only
    const ndc = new THREE.Vector2();

    function scatterLetters(): void {
      if (mode !== "idle" || !sceneReady) return;
      mode = "scatter";
      scatterClock = 0;
      for (const obj of wordRoot.children) {
        const data = obj.userData;
        const dir = (data.home as THREE.Vector3)
          .clone()
          .setZ((Math.random() - 0.5) * 200)
          .normalize();
        const speed = SCATTER_VEL_MIN + Math.random() * SCATTER_VEL_SPAN;
        (data.vel as THREE.Vector3)
          .copy(dir)
          .multiplyScalar(speed)
          .add(new THREE.Vector3(
            (Math.random() - 0.5) * 240,
            (Math.random() - 0.5) * 240 + 100,
            (Math.random() - 0.5) * 180,
          ));
        (data.spin as THREE.Vector3).set(
          (Math.random() - 0.5) * 2.2,
          (Math.random() - 0.5) * 2.2,
          (Math.random() - 0.5) * 2.2,
        );
      }
    }

    /* ── cursor → camera + first-move detection ────────────────── */
    let mouseX = 0;
    let mouseY = 0;
    function setMouse(clientX: number, clientY: number): void {
      mouseX = mouseAmp * (clientX - 0.5 * window.innerWidth);
      mouseY = mouseAmp * (clientY - 0.5 * window.innerHeight);
    }
    let firstMoveFlagged = false;
    function flagFirstMove(): void {
      if (firstMoveFlagged) return;
      firstMoveFlagged = true;
      onFirstMove();
    }

    /* ── event listeners ───────────────────────────────────────── */
    function onPointerDown(e: PointerEvent): void {
      const target = e.target as HTMLElement | null;
      // Don't scatter when the click is on a UI control (it's an a/button).
      if (target?.closest?.("a,button")) return;
      if (mode !== "idle" || !sceneReady) return;
      ndc.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.intersectObjects(wordRoot.children, false).length) scatterLetters();
    }
    function onPointerMove(e: PointerEvent): void {
      setMouse(e.clientX, e.clientY);
      flagFirstMove();
    }
    function onTouchMove(e: TouchEvent): void {
      if (!e.touches[0]) return;
      // Touch input gets boosted relative to mouse: on mobile your finger can
      // only traverse ~390px, vs ~1280px+ of cursor travel on desktop. Without
      // a gain the max parallax swing on mobile is ~30% of desktop's. The
      // 3.2× factor scales a full-screen swipe to roughly the same camera
      // sweep as a full-desktop cursor sweep, by amplifying the offset from
      // the screen center before passing it to setMouse.
      const TOUCH_GAIN = 3.2;
      const t = e.touches[0];
      const cx = 0.5 * window.innerWidth;
      const cy = 0.5 * window.innerHeight;
      setMouse(
        cx + (t.clientX - cx) * TOUCH_GAIN,
        cy + (t.clientY - cy) * TOUCH_GAIN,
      );
      flagFirstMove();
    }
    function onResize(): void {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      asciiPass.setSize(w, h, pixelRatio);
      // Recompute the camera distance + cursor amplitude so resizing (rotating a
      // tablet, splitting a desktop window) keeps the wordmark in frame AND keeps
      // the parallax drama consistent.
      baseZ = computeBaseZ(w);
      mouseAmp = MOUSE_AMP * (baseZ / BASE_Z);
      camera.position.z = baseZ;
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("resize", onResize);

    /* ── imperative API exposed to the React layer ─────────────── */
    apiRef.current = {
      setMaterial(name: MatName) {
        matName = name;
        rebuildHero();
        rebuildDebris();
        bloomPass.enabled = name === "neon";
      },
      setBgColor(swatch: Swatch) {
        bgHex = swatch.hex;
        document.body.classList.toggle("dark", swatch.dark);
        document.documentElement.style.setProperty("--bg", swatch.hex);
        document.documentElement.style.setProperty("--bg-deep", swatch.deep);
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", swatch.hex);
        renderer.toneMappingExposure = swatch.dark ? 1.18 : 1.0;
        // Re-derive every flat-overlay colour (ascii glyphs + point clouds) so
        // they stay legible over the new bg.
        asciiPass.setColor(pickContrastInk(heroTintHex));
        if (pointsLayer) {
          setHeroPointsColor(pointsLayer, pickContrastInk(heroTintHex));
          setDebrisPointsColor(pointsLayer, pickContrastInk(debrisTintHex));
        }
        swarmPointsMat.color.set(pickContrastInk(heroTintHex));
      },
      setHeroColor(swatch: Swatch) {
        heroTintHex = swatch.hex;
        rebuildHero();
        if (pointsLayer) setHeroPointsColor(pointsLayer, pickContrastInk(heroTintHex));
        swarmPointsMat.color.set(pickContrastInk(heroTintHex));
        asciiPass.setColor(pickContrastInk(heroTintHex));
      },
      setDebrisColor(swatch: Swatch) {
        debrisTintHex = swatch.hex;
        rebuildDebris();
        if (pointsLayer) setDebrisPointsColor(pointsLayer, pickContrastInk(debrisTintHex));
      },
      // Scene-console setters. Behavior is wired into the render loop and the
      // per-mode modules (sceneAscii / scenePoints / sceneGravity) as those
      // land; these just record the requested state.
      setRenderMode(next: RenderMode) {
        // Build the point clouds the first time points mode is entered (never
        // on load — keeps the boot animation hitch-free).
        if (next === "points") buildPointsIfNeeded();
        renderMode = next;
      },
      setGravity(on: boolean) {
        gravityOn = on;
      },
      setSloMo(on: boolean) {
        sloMoOn = on;
      },
    };

    /* ── boot: load font, build phrases, kick off animation ────── */
    const timer = new THREE.Timer();
    timer.connect(document); // page-visibility API → auto-pause when the tab is hidden

    let disposed = false;
    let raf = 0;

    // Respect prefers-reduced-motion — but don't lock these users to a fully
    // frozen single frame. The earlier "render once and stop" behavior read as
    // a broken/loading state to viewers who didn't realise macOS Reduce Motion
    // was on (confirmed in production 2026-06-06). The current behavior keeps
    // the animation loop running with a quieter mix:
    //
    //   ON for reduced-motion:  gentle breathing (no sudden motion),
    //                            cursor parallax (user-initiated),
    //                            letter scatter on click (user-initiated)
    //   OFF for reduced-motion: the off-screen fly-in on first load,
    //                            the autonomous phrase-transition machine
    //                            (dissolve / particle swarm / reform),
    //                            phrase cycling
    //
    // Net result: the hero reads as alive and 3D for accessibility users
    // without ambushing them with autonomous animation they didn't ask for.
    const prefersReducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      // Skip the off-screen-left swoop the camera would otherwise do — park it
      // at home position so the first rendered frame is already at rest.
      camera.position.set(0, 0, baseZ);
    }

    // FontLoader signature: (url, onLoad, onProgress, onError). Without an
    // onError, a network failure (content blocker, deploy mishap) would
    // never resolve onReady() and the "initializing" loader would stay up
    // forever. Route font failures into the same DOM-fallback path as a
    // WebGL failure — the static hero is a better last-resort than a
    // permanently-loading state. The third arg (onProgress) is unused.
    new FontLoader().load(
      "/fonts/jetbrains-mono_extrabold.typeface.json",
      (loaded) => {
        if (disposed) return;
        font = loaded;
        for (const text of PHRASES) phraseLetterMeshes.push(buildPhrase(text, font, heroMaterial));
        // Pre-sample every phrase's particle layout once — deterministic per
        // phrase, so caching here removes the sampling spike from each transition.
        for (const meshes of phraseLetterMeshes) {
          phraseSamples.push(samplePhrase(meshes, particles.count));
        }
        attachPhraseToRoot(wordRoot, phraseLetterMeshes[phraseIndex], heroMaterial);
        sceneReady = true;

        // ASCII boot — the hero types itself in as characters, holds, then
        // compiles to solid chrome. It replaces the camera swoop-in as the
        // first-load reveal (cleaner than running both), so park the camera at
        // home. Skipped under reduced motion (those users get the static hero).
        if (!prefersReducedMotion) {
          bootActive = true;
          bootClock = 0;
          asciiMix = 0;
          solidMix = 0; // start fully ascii; the compile fades the solid in
          camera.position.set(0, 0, baseZ);
        }

        onReady();
      },
      undefined,
      (err) => {
        if (disposed) return;
        const ua =
          typeof navigator !== "undefined" ? navigator.userAgent : "n/a";
        console.error(
          `[useHeroScene] FontLoader failed — showing static fallback.\n` +
            `  url: /fonts/jetbrains-mono_extrabold.typeface.json\n` +
            `  userAgent: ${ua}\n` +
            `  error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
        );
        onError();
      },
    );

    /* ── animation loop ────────────────────────────────────────── */
    // The fast solid render — debris on layer 0 (clears colour + depth), then
    // the wordmark + particle swarm on layer 1 with depth reset so the type
    // always wins. Used for the default render and as the boot-compile backdrop.
    function drawSolid(): void {
      renderer.autoClear = true;
      camera.layers.set(0);
      renderer.render(scene, camera);
      renderer.autoClear = false;
      renderer.clearDepth();
      camera.layers.set(1);
      renderer.render(scene, camera);
      renderer.autoClear = true;
      camera.layers.enableAll();
    }

    function animate(): void {
      raf = requestAnimationFrame(animate);
      timer.update();
      const dt = Math.min(MAX_DT, timer.getDelta());
      const t = timer.getElapsed();

      // ASCII boot dissolve — structured EXACTLY like the prototype: the boot
      // clock always advances (so the loader can run 0.8s past the hold), and
      // `booting` is DERIVED from it (the type-in + hold window). After the
      // hold, the same exponential the manual toggle uses eases asciiMix → 0
      // (open-ended compile dissolve, not a linear ramp).
      if (bootActive) bootClock += dt;
      const booting = bootActive && bootClock < BOOT_HOLD;
      if (bootActive && bootClock < BOOT_TYPE) {
        const k = bootClock / BOOT_TYPE;
        asciiMix = 1 - (1 - k) * (1 - k); // ease-out type-in
      } else if (booting) {
        asciiMix = 1; // full-ascii hold
      } else {
        const asciiTarget = renderMode === "ascii" ? 1 : 0;
        asciiMix += (asciiTarget - asciiMix) * (1 - Math.exp(-6 * dt));
      }
      // Solid opacity for the crossfade. Held near 0 through the boot (and in
      // steady ascii), eased to 1 as the scene compiles to solid — so the
      // wordmark + debris FADE IN under the dissolving cells (matching the
      // prototype) instead of the ascii wiping off a full-opacity backdrop.
      const solidTarget = booting || renderMode === "ascii" ? 0 : 1;
      solidMix += (solidTarget - solidMix) * (1 - Math.exp(-6 * dt));
      // Once the compile has settled, retire the boot so the clock stops.
      if (bootActive && !booting && asciiMix < 0.004 && solidMix > 0.996) {
        bootActive = false;
      }

      // Boot loader readout — "boot ▸ rasterizing/shading/compiled ▓▓░ NN%".
      // Verbatim from the prototype: three phases, visible through the type-in
      // + hold and for 0.8s into the compile (fading via opacity), then gone.
      if (bootRef.current) {
        if (bootActive && bootClock < BOOT_HOLD + 0.8) {
          const pct = Math.min(1, bootClock / BOOT_HOLD);
          const blocks = Math.round(pct * 14);
          const phase =
            bootClock < BOOT_TYPE ? "rasterizing" : booting ? "shading" : "compiled";
          bootRef.current.textContent =
            `boot ▸ ${phase} ${"▓".repeat(blocks)}${"░".repeat(14 - blocks)} ` +
            `${String(Math.round(pct * 100)).padStart(3, " ")}%`;
          bootRef.current.style.opacity = booting ? "1" : "0";
        } else {
          bootRef.current.style.opacity = "0";
        }
      }

      // Whole-scene breathing — the debris cloud tumbles, the wordmark gently tilts.
      // The wordmark's Z-rotation deliberately re-uses `rx` (not `rz`) — this mirrors
      // ilithya's reference scene, where the type's roll cycles faster than the
      // debris's (the X and Z axes share the 0.7 frequency, the debris rolls slower
      // at 0.2). Removing this and using `rz` would break the visual signature.
      const rx = BREATH_AMP * Math.sin(0.7 * t);
      const ry = BREATH_AMP * Math.sin(0.3 * t);
      const rz = BREATH_AMP * Math.sin(0.2 * t);
      wordRoot.rotation.set(rx, ry, rx);
      // Particle swarm sits in its own group; copy the wordmark's breathing
      // rotation so the swarm tracks the wordmark during transitions.
      particles.group.rotation.copy(wordRoot.rotation);

      // ── debris gravity + breathing ────────────────────────────────
      // While gravity is engaged the debris breathing eases to flat so pieces
      // fall along true world-down (not the 17° breathing tilt); it eases back
      // when released. `gravityEngaged` stays true through the spring-home so
      // the field finishes settling before breathing resumes.
      const gravityEngaged = gravityOn || !gravitySettled;
      dbBreath += ((gravityEngaged ? 0 : 1) - dbBreath) * (1 - Math.exp(-5 * dt));
      debrisGroup.rotation.set(rx * dbBreath, ry * dbBreath, rz * dbBreath);
      if (gravityEngaged) {
        const physDt = sloMoOn ? dt * 0.16 : dt;
        gravitySettled = updateGravity(gravityField, physDt, gravityOn);
        // In points mode the debris cloud is baked from rest matrices, so
        // refresh it from the live (falling) instances.
        if (renderMode === "points" && pointsLayer) rebakeDebrisPoints(pointsLayer);
      }

      if (sceneReady) {
        if (mode === "idle" && prefersReducedMotion) {
          // Reduced-motion path: hold the first phrase steady (no autonomous
          // dissolve / particle swarm / reform). User-initiated scatter still
          // runs via the `else` branch below if they click the wordmark.
          phraseOpacity = 1;
        } else if (mode === "idle") {
          // ── phrase-transition phase machine ─────────────────────────
          //   IDLE     letters fully solid; particles hidden.
          //   DISSOLVE letters fade out; particles explode outward from each
          //            sampled letter-surface point.
          //   TRAVEL   letters invisible; particles coast and damp. Phrase
          //            index increments mid-TRAVEL so the new wordmark is
          //            in place before targets are resampled.
          //   REFORM   letters fade in as particles exponentially lerp toward
          //            the new phrase's surface targets.
          phaseClock += dt;
          if (phraseTransitionPhase === "IDLE") {
            phraseOpacity += (1 - phraseOpacity) * OPACITY_LERP;
            if (phaseClock >= PHASE_IDLE_DUR) {
              phaseClock = 0;
              phraseTransitionPhase = "DISSOLVE";
              // Point at the cached layout of the phrase about to dissolve, so
              // particles start exactly on those letters. O(1) reference swap.
              applyPhraseSample(particles, phraseSamples[phraseIndex]);
              startDissolve(particles);
            }
          } else if (phraseTransitionPhase === "DISSOLVE") {
            // Sharp letter pop — fade out across only the first ~30% of the
            // dissolve phase, then hold at 0. The burst dominates the rest of
            // the phase so the eye reads "letters EXPLODED" instead of
            // "letters slowly faded while some particles appeared".
            const dn = Math.min(1, (phaseClock / PHASE_DISSOLVE_DUR) * 3.3);
            const eased = dn * dn * (3 - 2 * dn);
            phraseOpacity = 1 - eased;
            updateParticles(particles, "DISSOLVE", dt);
            if (phaseClock >= PHASE_DISSOLVE_DUR) {
              phaseClock = 0;
              phraseTransitionPhase = "TRAVEL";
              // Advance to the next phrase and attach its letters now while
              // they're at opacity 0 — invisible until REFORM brings them in.
              phraseIndex = (phraseIndex + 1) % phraseLetterMeshes.length;
              attachPhraseToRoot(wordRoot, phraseLetterMeshes[phraseIndex], heroMaterial);
              phraseOpacity = 0;
            }
          } else if (phraseTransitionPhase === "TRAVEL") {
            phraseOpacity = 0;
            updateParticles(particles, "TRAVEL", dt);
            if (phaseClock >= PHASE_TRAVEL_DUR) {
              phaseClock = 0;
              phraseTransitionPhase = "REFORM";
              // Point at the NEW phrase's cached layout, then arm REFORM: clear
              // hasStarted so each particle's lerp begins from wherever it
              // actually is when its stagger fires. O(1) reference swap.
              applyPhraseSample(particles, phraseSamples[phraseIndex]);
              startReform(particles);
            }
          } else {
            // REFORM — particles converge to surface targets via time-based
            // eased lerp (guaranteed to land at end of phase). Letters stay
            // INVISIBLE until particles have essentially arrived (last 10% of
            // the phase), then a quick smoothstep handoff: letter opacity
            // rises from 0 to 1 while particle scale fades from 1 to 0. The
            // particles visually become the letters.
            const dn = phaseClock / PHASE_REFORM_DUR;
            const HANDOFF_START = 0.9;
            const fade = Math.max(0, (dn - HANDOFF_START) / (1 - HANDOFF_START));
            const eased = fade * fade * (3 - 2 * fade);
            phraseOpacity = eased;
            const particleScale = 1 - eased;
            updateParticles(
              particles,
              "REFORM",
              dt,
              phaseClock,
              PHASE_REFORM_DUR,
              particleScale,
            );
            if (phaseClock >= PHASE_REFORM_DUR) {
              phaseClock = 0;
              phraseTransitionPhase = "IDLE";
              endReform(particles);
              phraseOpacity = 1;
            }
          }
        } else {
          phraseOpacity += (1 - phraseOpacity) * 0.3;
          scatterClock += dt;
          if (mode === "scatter") {
            for (const mesh of wordRoot.children) {
              const u = mesh.userData;
              mesh.position.addScaledVector(u.vel, dt);
              u.vel.multiplyScalar(Math.pow(VEL_DAMP, dt));
              // Per-letter pseudo-random nudge so they drift instead of straight-line.
              u.vel.x += Math.sin(t * 1.3 + u.seed) * 55 * dt;
              u.vel.y += (Math.sin(t * 0.9 + u.seed * 1.7) * 55 + 14) * dt;
              u.vel.z += Math.sin(t * 1.5 + u.seed * 2.3) * 40 * dt;
              const dist = mesh.position.length();
              if (dist > SCATTER_CLAMP) {
                mesh.position.multiplyScalar(SCATTER_CLAMP / dist);
                u.vel.multiplyScalar(0.5);
              }
              mesh.rotation.x += u.spin.x * dt;
              mesh.rotation.y += u.spin.y * dt;
              mesh.rotation.z += u.spin.z * dt;
            }
            if (scatterClock >= SCATTER_HOLD) {
              mode = "regroup";
              scatterClock = 0;
            }
          } else {
            // Regroup: spring every letter back toward its home position and orientation.
            const k = 1 - Math.pow(REGROUP_SPRING, dt);
            for (const mesh of wordRoot.children) {
              mesh.position.lerp(mesh.userData.home, k);
              mesh.rotation.x += (0 - mesh.rotation.x) * k;
              mesh.rotation.y += (0 - mesh.rotation.y) * k;
              mesh.rotation.z += (0 - mesh.rotation.z) * k;
            }
            if (scatterClock >= REGROUP_DUR) {
              mode = "idle";
              // Reset the transition machine so the phrase doesn't immediately
              // dissolve right after a scatter interaction completes.
              phaseClock = 0;
              phraseTransitionPhase = "IDLE";
              for (const mesh of wordRoot.children) {
                mesh.position.copy(mesh.userData.home);
                mesh.rotation.set(0, 0, 0);
              }
              // Hide the particle swarm. If the user clicked DURING a phrase
              // transition (DISSOLVE/TRAVEL/REFORM), particles were visible
              // when scatter took over and the phase machine never reached
              // its own `endReform` call at the end of REFORM. Without this
              // line the wordmark reforms cleanly but the particle cloud
              // stays stuck on screen until the next phrase cycle. Safe to
              // call even if particles were already hidden — it just sets
              // mesh.visible = false.
              endReform(particles);
            }
          }
        }
        // ── apply render mode (solid / points; ascii is a post-process at
        //    render time) — points hides the solid surfaces and shows the
        //    sampled clouds with the same opacity envelope. ──────────────
        const op = Math.max(0, phraseOpacity);
        const inPoints = renderMode === "points";
        if (inPoints) {
          // The solid letters host the point twins as children, so we can't
          // just hide the meshes (that would hide the points too). Instead stop
          // the solid surface painting AND writing depth — otherwise the
          // invisible caps occlude the point cloud behind them (the streaky,
          // half-missing look). The point twins keep their own depthWrite:false.
          heroMaterial.opacity = 0;
          heroMaterial.colorWrite = false;
          heroMaterial.depthWrite = false;
          if (pointsLayer) {
            pointsLayer.heroMat.opacity = op;
            pointsLayer.debrisMat.opacity = 1;
            for (const p of pointsLayer.letterTwins) p.visible = true;
            pointsLayer.debrisPoints.visible = true;
            for (const m of debrisMeshes) m.visible = false;
          }
          // Dissolve swarm as points: suppress the solid shards (colorWrite /
          // depthWrite off, like the letters) and show the Points twin while a
          // transition is running, syncing it from the live particle buffer.
          particleMaterial.colorWrite = false;
          particleMaterial.depthWrite = false;
          swarmPoints.visible = particles.mesh.visible;
          if (swarmPoints.visible) {
            (swarmPointsGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
          }
        } else {
          heroMaterial.opacity = op;
          heroMaterial.colorWrite = true;
          heroMaterial.depthWrite = true;
          particleMaterial.colorWrite = true;
          particleMaterial.depthWrite = true;
          swarmPoints.visible = false;
          if (pointsLayer) {
            pointsLayer.heroMat.opacity = 0;
            pointsLayer.debrisMat.opacity = 0;
            for (const p of pointsLayer.letterTwins) p.visible = false;
            pointsLayer.debrisPoints.visible = false;
            for (const m of debrisMeshes) m.visible = true;
          }
        }
      }

      // Cursor → camera: big-amplitude swing in X/Y, Z fixed → automatic zoom + steep perspective.
      camera.position.x += CAM_FOLLOW * (-mouseX - camera.position.x);
      camera.position.y += CAM_FOLLOW * (mouseY - camera.position.y);
      camera.lookAt(lookTarget);

      // Render. Paths:
      //   ascii / boot → CROSSFADE: the solid scene is drawn at `solidMix`
      //                  opacity (a faded backdrop that materialises during the
      //                  compile), then the depth-banded glyph quad on top at
      //                  `asciiMix`. The ascii RT is always sampled at FULL
      //                  opacity so the character art stays crisp while the
      //                  solid fades in. Steady ascii also adds the mirror-cap
      //                  overlay for readable faces.
      //   neon         → composer (bloom pass).
      //   else         → the fast two-layer straight-to-canvas render.
      // `asciiMix > 0.004` keeps the path alive through the compile dissolve
      // after `booting` flips false (and through a manual toggle-off dissolve).
      const asciiActive = (renderMode === "ascii" || booting || asciiMix > 0.004) && sceneReady;
      if (asciiActive) {
        const wordDist = camera.position.length(); // wordmark sits at the origin
        // 1. Solid backdrop at solidMix opacity (the crossfade's fade-in). Near
        //    0 during the type-in / hold and in steady ascii → just clear to bg.
        //    Eases to 1 as the scene compiles, so the wordmark + debris
        //    materialise UNDER the dissolving cells rather than being wiped to.
        //    Single enable-all pass (matches the prototype, and one render
        //    instead of the two-layer drawSolid — lighter during the boot).
        if (solidMix > 0.004) {
          const hOp = heroMaterial.opacity;
          const dOp = debrisMaterial.opacity;
          heroMaterial.opacity = hOp * solidMix;
          debrisMaterial.opacity = dOp * solidMix;
          renderer.autoClear = true;
          camera.layers.enableAll();
          renderer.render(scene, camera);
          heroMaterial.opacity = hOp; // restore full for the ascii RT sample below
          debrisMaterial.opacity = dOp;
        } else {
          renderer.clear();
        }
        // 2. ASCII overlay — RT sampled at FULL opacity (crisp), composited over
        //    the backdrop without clearing it.
        asciiPass.render(
          renderer,
          () => {
            // Draw the world into the bound RT — one enable-all pass so the
            // depth buffer is physically correct for the band slicing.
            camera.layers.enableAll();
            renderer.render(scene, camera);
          },
          wordDist,
          asciiMix,
          false,
        );

        // Hybrid overlay — redraw the letter CAPS solid (mirror) over the
        // ASCII with the extrude SIDES suppressed, so the body stays character
        // art. Runs in steady ascii AND during the boot: after the type-in the
        // faces RESOLVE IN (ramp over 0.5s), so the boot reads pure-ascii →
        // reflective faces over ascii body → full solid — matching the
        // prototype. `faceRamp` is the boot resolve; in steady ascii it's 1.
        // Because the overlay is ∝ asciiMix, the faces fade out as the compile
        // dissolves the cells and the full solid fades in beneath.
        if (renderMode === "ascii" || booting) {
          const faceRamp = booting
            ? Math.min(1, Math.max(0, (bootClock - BOOT_TYPE) / 0.5))
            : 1;
          const overlay = asciiMix * Math.max(0, phraseOpacity) * faceRamp;
          if (overlay > 0.004) {
            faceMaterial.opacity = overlay;
            for (const m of wordRoot.children) (m as THREE.Mesh).material = [faceMaterial, sideHide];
            debrisGroup.visible = false;
            particles.group.visible = false;
            renderer.autoClear = false;
            renderer.clearDepth();
            camera.layers.set(1);
            renderer.render(scene, camera);
            renderer.autoClear = true;
            camera.layers.enableAll();
            for (const m of wordRoot.children)
              (m as THREE.Mesh).material = [heroMaterial, heroMaterial];
            debrisGroup.visible = true;
            particles.group.visible = true;
          }
        }
      } else if (bloomPass.enabled) {
        composer.render();
      } else {
        drawSolid();
      }
    }
    // Loop runs for everyone. Reduced-motion users get a quieter version of it
    // (no fly-in, no autonomous phrase machine) per the gating earlier in this
    // effect — but they still get gentle breathing, parallax, and scatter.
    animate();

    /* ── teardown ──────────────────────────────────────────────── */
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      timer.dispose();
      apiRef.current = null;
      for (const meshes of phraseLetterMeshes) for (const m of meshes) (m.geometry as THREE.BufferGeometry).dispose();
      for (const mesh of debrisMeshes) mesh.geometry.dispose();
      pointsLayer?.dispose();
      asciiPass.dispose();
      swarmPointsGeo.dispose();
      swarmPointsMat.dispose();
      swarmDotTex.dispose();
      disposeParticleSystem(particles);
      heroMaterial.dispose();
      debrisMaterial.dispose();
      particleMaterial.dispose();
      faceMaterial.dispose();
      sideHide.dispose();
      envRenderTarget.dispose();
      faceEnvRenderTarget.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
      // The hero may have set a dark theme or custom bg vars — clean up after ourselves.
      document.body.classList.remove("dark");
      document.documentElement.style.removeProperty("--bg");
      document.documentElement.style.removeProperty("--bg-deep");
    };
    // Effect runs once on mount. We use refs / closure to react to React-state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
