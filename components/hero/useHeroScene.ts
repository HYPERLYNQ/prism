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
  PHRASE_DUR,
  PHRASE_FADE,
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
import { attachPhraseToRoot, buildPhrase } from "./sceneWordmark";
import { setupComposer } from "./sceneComposer";
import type { SceneApi } from "./sceneTypes";

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

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.innerWidth < 1920,
      powerPreference: "high-performance",
    });
    const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
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
    const envRenderTarget = pmrem.fromScene(buildEnvScene(), 0.02);
    scene.environment = envRenderTarget.texture;

    /* ── postprocessing ────────────────────────────────────────── */
    const { composer, bloomPass } = setupComposer(renderer, scene, camera, pixelRatio);

    /* ── materials ─────────────────────────────────────────────── */
    // The default bg lives in CSS as the initial `--bg` value; we don't need to track
    // it in the scene closure since nothing in the three.js world reads it.
    let heroTintHex = SWATCHES.find((s) => s.name === "ink")?.hex ?? "#15171C";
    let debrisTintHex = SWATCHES.find((s) => s.name === "ink")?.hex ?? "#15171C";
    let matName: MatName = DEFAULT_FINISH;

    let heroMaterial = makePreset(matName, heroTintHex);
    heroMaterial.transparent = true;
    heroMaterial.opacity = 0;
    let debrisMaterial = makePreset(matName, debrisTintHex);

    /* ── debris cloud ──────────────────────────────────────────── */
    const debrisGroup = new THREE.Group();
    scene.add(debrisGroup);
    const cameraRest = new THREE.Vector3(0, 0, baseZ);
    const debrisMeshes = placeDebris(debrisGroup, debrisMaterial, cameraRest, debrisCount);

    /* ── wordmark scaffolding (populated after the font loads) ──── */
    const wordRoot = new THREE.Group();
    scene.add(wordRoot);
    const phraseLetterMeshes: THREE.Mesh[][] = [];
    let font: Font | null = null;
    let sceneReady = false;
    let phraseIndex = 0;
    let phraseClock = 0;
    let phraseOpacity = 0;

    /* ── material-swap helpers (used by the imperative API setters) ── */
    /** Rebuild the hero material with the current finish + hero-tint, swap into every letter mesh. */
    function rebuildHero(): void {
      const next = makePreset(matName, heroTintHex);
      next.transparent = true;
      next.opacity = heroMaterial.opacity;
      const prev = heroMaterial;
      heroMaterial = next;
      for (const meshes of phraseLetterMeshes) for (const m of meshes) m.material = heroMaterial;
      prev.dispose();
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
      for (const mesh of debrisMeshes) mesh.material = debrisMaterial;
      prev.dispose();
    }

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
      setMouse(e.touches[0].clientX, e.touches[0].clientY);
      flagFirstMove();
    }
    function onResize(): void {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
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
        document.body.classList.toggle("dark", swatch.dark);
        document.documentElement.style.setProperty("--bg", swatch.hex);
        document.documentElement.style.setProperty("--bg-deep", swatch.deep);
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", swatch.hex);
        renderer.toneMappingExposure = swatch.dark ? 1.18 : 1.0;
      },
      setHeroColor(swatch: Swatch) {
        heroTintHex = swatch.hex;
        rebuildHero();
      },
      setDebrisColor(swatch: Swatch) {
        debrisTintHex = swatch.hex;
        rebuildDebris();
      },
    };

    /* ── boot: load font, build phrases, kick off animation ────── */
    const timer = new THREE.Timer();
    timer.connect(document); // page-visibility API → auto-pause when the tab is hidden

    let disposed = false;
    let raf = 0;

    new FontLoader().load("/fonts/helvetiker_bold.typeface.json", (loaded) => {
      if (disposed) return;
      font = loaded;
      for (const text of PHRASES) phraseLetterMeshes.push(buildPhrase(text, font, heroMaterial));
      attachPhraseToRoot(wordRoot, phraseLetterMeshes[phraseIndex], heroMaterial);
      sceneReady = true;
      onReady();
    });

    /* ── animation loop ────────────────────────────────────────── */
    function animate(): void {
      raf = requestAnimationFrame(animate);
      timer.update();
      const dt = Math.min(MAX_DT, timer.getDelta());
      const t = timer.getElapsed();

      // Whole-scene breathing — the debris cloud tumbles, the wordmark gently tilts.
      // The wordmark's Z-rotation deliberately re-uses `rx` (not `rz`) — this mirrors
      // ilithya's reference scene, where the type's roll cycles faster than the
      // debris's (the X and Z axes share the 0.7 frequency, the debris rolls slower
      // at 0.2). Removing this and using `rz` would break the visual signature.
      const rx = BREATH_AMP * Math.sin(0.7 * t);
      const ry = BREATH_AMP * Math.sin(0.3 * t);
      const rz = BREATH_AMP * Math.sin(0.2 * t);
      debrisGroup.rotation.set(rx, ry, rz);
      wordRoot.rotation.set(rx, ry, rx);

      if (sceneReady) {
        if (mode === "idle") {
          phraseClock += dt;
          if (phraseClock >= PHRASE_DUR) {
            phraseClock -= PHRASE_DUR;
            phraseIndex = (phraseIndex + 1) % phraseLetterMeshes.length;
            attachPhraseToRoot(wordRoot, phraseLetterMeshes[phraseIndex], heroMaterial);
            phraseOpacity = 0;
          }
          const fadeIn = Math.min(1, phraseClock / PHRASE_FADE);
          const fadeOut = Math.min(1, (PHRASE_DUR - phraseClock) / PHRASE_FADE);
          const target = Math.min(fadeIn, fadeOut);
          phraseOpacity += (target - phraseOpacity) * OPACITY_LERP;
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
              phraseClock = 0;
              for (const mesh of wordRoot.children) {
                mesh.position.copy(mesh.userData.home);
                mesh.rotation.set(0, 0, 0);
              }
            }
          }
        }
        heroMaterial.opacity = Math.max(0, phraseOpacity);
      }

      // Cursor → camera: big-amplitude swing in X/Y, Z fixed → automatic zoom + steep perspective.
      camera.position.x += CAM_FOLLOW * (-mouseX - camera.position.x);
      camera.position.y += CAM_FOLLOW * (mouseY - camera.position.y);
      camera.lookAt(lookTarget);

      composer.render();
    }
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
      heroMaterial.dispose();
      debrisMaterial.dispose();
      envRenderTarget.dispose();
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
