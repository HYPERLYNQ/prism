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
    const envRenderTarget = pmrem.fromScene(buildEnvScene(), 0.02);
    scene.environment = envRenderTarget.texture;

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

    let heroMaterial = makePreset(matName, heroTintHex);
    heroMaterial.transparent = true;
    heroMaterial.opacity = 0;
    let debrisMaterial = makePreset(matName, debrisTintHex);

    // Particle material: a parallel always-opaque clone of the hero finish.
    // Particles share the picked finish + colour with the wordmark, but stay
    // opaque so they don't fade with the letter dissolve envelope (they ARE
    // the dissolve — the letters are what fade).
    let particleMaterial = makePreset(matName, heroTintHex);

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
      for (const meshes of phraseLetterMeshes) for (const m of meshes) m.material = heroMaterial;
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

    // Respect prefers-reduced-motion: skip the continuous WebGL animation loop
    // (the fly-in, breathing, phrase dissolves, particle swarm) and instead
    // render a single static frame of the first phrase. Saves these users a
    // heavy, sustained rAF loop and avoids motion they've asked not to see.
    const prefersReducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Render one resting frame: camera at rest, wordmark at home + full opacity. */
    function renderStaticFrame(): void {
      camera.position.set(0, 0, baseZ);
      camera.lookAt(lookTarget);
      heroMaterial.opacity = 1;
      composer.render();
    }

    new FontLoader().load("/fonts/helvetiker_bold.typeface.json", (loaded) => {
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
      onReady();
      // Reduced-motion: the rAF loop never starts, so paint the resting frame
      // here once the wordmark exists.
      if (prefersReducedMotion) renderStaticFrame();
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
      // Particle swarm sits in its own group; copy the wordmark's breathing
      // rotation so the swarm tracks the wordmark during transitions.
      particles.group.rotation.copy(wordRoot.rotation);

      if (sceneReady) {
        if (mode === "idle") {
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
            }
          }
        }
        heroMaterial.opacity = Math.max(0, phraseOpacity);
      }

      // Cursor → camera: big-amplitude swing in X/Y, Z fixed → automatic zoom + steep perspective.
      camera.position.x += CAM_FOLLOW * (-mouseX - camera.position.x);
      camera.position.y += CAM_FOLLOW * (mouseY - camera.position.y);
      camera.lookAt(lookTarget);

      // Render. Only the neon finish needs the composer (for its bloom pass).
      // Every other finish renders the two layers straight to the canvas — this
      // skips the composer's offscreen render target + the full-screen OutputPass
      // quad every frame, and lets the hardware MSAA (antialias:true) do the AA.
      // The renderer's ACES tonemapping + sRGB output (set at init) match what
      // OutputPass would have applied, so the image is visually equivalent.
      if (bloomPass.enabled) {
        composer.render();
      } else {
        renderer.autoClear = true;
        camera.layers.set(0); // debris — clears colour + depth
        renderer.render(scene, camera);
        renderer.autoClear = false;
        renderer.clearDepth(); // keep colour, reset depth so the wordmark wins
        camera.layers.set(1); // wordmark + particle swarm, drawn on top
        renderer.render(scene, camera);
        renderer.autoClear = true;
        camera.layers.enableAll();
      }
    }
    // Reduced-motion users get a single static frame (rendered in the font-load
    // callback) instead of the continuous loop.
    if (!prefersReducedMotion) animate();

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
      disposeParticleSystem(particles);
      heroMaterial.dispose();
      debrisMaterial.dispose();
      particleMaterial.dispose();
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
