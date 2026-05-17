"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Glossy 3D lava-lamp blob — animated MarchingCubes isosurface with real
 * metaball merging + pinch-off behaviour.
 *
 * Why MarchingCubes (vs. multiple separate spheres):
 *   Multiple spheres can fake clustering by overlapping, but they can't do
 *   the cinematic *merged liquid* look — the smooth bridge between two
 *   close balls, the stretching neck as one pinches off, the snap as it
 *   detaches. That requires a real implicit surface (sum of metaball
 *   fields > isolation). MarchingCubes is the standard tool.
 *
 * Why this time it's sharp where earlier attempts looked faceted:
 *   • Resolution 128 (was 64–96) — each field cell becomes a smaller
 *     polygon, well under one CSS pixel on screen at the banner's
 *     render size. Polygon facets stop being visible.
 *   • Mesh scale 0.45 (was 0.8+) — the blob occupies a tighter screen
 *     footprint, so the same polygon count covers fewer pixels each,
 *     reinforcing the sub-pixel facet size.
 *   • MeshPhysicalMaterial + PMREM env map + 2× supersample (instead of
 *     a custom raymarched shader). The PBR pipeline handles glossiness
 *     correctly out of the box.
 *
 * Animation matches the mockup pattern:
 *   • 4 "centre" balls cluster tightly around a slowly drifting origin
 *     — they form the main organism.
 *   • 2 "pinch-off" balls cycle through state: cluster with the centre,
 *     elongate outward, detach, drift in the background, then return.
 *     Per-ball phase offsets so the two pinch off at different times.
 *   • The smooth-union K (`mcubes.isolation` and smin parameter) is kept
 *     low enough that detached balls visibly snap free instead of being
 *     attached by a long thin bridge.
 */

type ProjectBlobBannerProps = {
  slug: string;
};

const NB = 6; // metaball field points: 4 centre + 2 pinch-off

export default function ProjectBlobBanner({ slug: _slug }: ProjectBlobBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Canvas + renderer ────────────────────────────────────────────
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // ── Scene + camera ───────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0.1, 4.5);

    // ── Environment via PMREM ────────────────────────────────────────
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomScene = new RoomEnvironment();
    const envMapRT = pmrem.fromScene(roomScene, 0.04);
    scene.environment = envMapRT.texture;

    // ── Lights ───────────────────────────────────────────────────────
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(2, 3, 4);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    // ── Material: iridescent oil-slick PBR ───────────────────────────
    // Strong iridescence needs:
    //   - DARK base colour (so the thin-film interference colours read
    //     as bright over dark — like petrol on wet asphalt)
    //   - NO clearcoat (clearcoat sits OVER the iridescent layer and
    //     mutes it)
    //   - High `iridescenceIOR` for saturated rainbow shift
    //   - Wide `iridescenceThicknessRange` so the sweep traverses a
    //     full rainbow across the surface
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0A0A12,
      metalness: 1.0,
      roughness: 0.15,
      envMapIntensity: 1.2,
      iridescence: 1.0,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [200, 800],
    });

    // ── MarchingCubes blob ───────────────────────────────────────────
    // Resolution 80 — sweet spot for the banner size. 128 was hammering
    // the CPU (~2M field cells polygonized every frame); 80 drops that
    // to ~512k cells = ~⅛ the work, and the polygons stay small enough
    // at the banner's render footprint that facets aren't visible.
    const mcubes = new MarchingCubes(80, material, false, false, 200000);
    mcubes.isolation = 80;
    // Target final scale. Starts at 0 (invisible) and eases up during
    // the intro animation (see INTRO_DUR below).
    const TARGET_SCALE = 1.9;
    mcubes.scale.setScalar(0);
    // CRITICAL: stale bounding sphere at world origin would cull this mesh
    // out of frustum once we move it. Disable frustum culling outright.
    mcubes.frustumCulled = false;
    scene.add(mcubes);

    // ── Resize ───────────────────────────────────────────────────────
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ── Animation state ──────────────────────────────────────────────
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let rafId = 0;
    let running = true;

    // Per-ball phase offsets — deterministic so SSR and CSR match.
    const phases: number[] = [];
    for (let i = 0; i < NB; i++) phases.push(i * 1.91 + 0.7);

    // Pinch-off cycle for the 2 "free" balls (indices 4, 5).
    // Each ball has its own period + phase so they don't pinch in sync.
    // The cycle: cluster → elongate (visible thin neck) → detach → drift
    // around as a free metablob → return → re-merge.
    // Directions are slowly time-varying so each pinch-off heads in a
    // different direction from the previous one — the metablobs explore
    // the full banner over time instead of always going the same way.
    const PINCH_PERIOD = [18.0, 22.0];     // full cycle seconds per ball
    const PINCH_PHASE = [0.0, 9.0];        // offset so they pinch out-of-phase
    const pinchDir = (j: number, t: number): [number, number, number] => {
      // Each pinch-off direction rotates slowly around a base angle so
      // successive metablobs come out in different directions. Y stays
      // mostly small to keep metablobs roughly in-plane with the banner.
      const baseAngle = j === 0 ? 0.2 : -0.4;
      const angle = baseAngle + Math.sin(t * 0.04 + j * 1.7) * 1.6;
      const yBias = j === 0 ? 0.35 : -0.30;
      return [Math.cos(angle), yBias + 0.15 * Math.sin(t * 0.03 + j), 0.1 * Math.sin(angle)];
    };

    // Field-space ball positions are in [0, 1]; we centre at 0.5 and add
    // small offsets. addBall(x, y, z, strength, subtract) — strength /
    // subtract together set each ball's effective radius in the field.
    const updateBalls = (t: number) => {
      mcubes.reset();

      // Slow drift of the cluster centre — keeps the organism alive.
      const cx = 0.04 * Math.sin(t * 0.18) + 0.03 * Math.sin(t * 0.11 + 1.7);
      const cy = 0.04 * Math.sin(t * 0.15 + 2.3) + 0.025 * Math.sin(t * 0.09);
      const cz = 0.03 * Math.sin(t * 0.13 + 4.1);

      const strength = 0.55;
      const subtract = 12;

      // ── Centre balls (indices 0..3) — tightly clustered, always merged.
      for (let i = 0; i < 4; i++) {
        const p = phases[i];
        const wx = Math.sin(t * 0.40 + p * 1.7) + 0.4 * Math.sin(t * 0.22 + p * 2.9);
        const wy = Math.sin(t * 0.35 + p * 2.3 + 0.5) + 0.4 * Math.sin(t * 0.18 + p * 1.3);
        const wz = Math.sin(t * 0.32 + p * 1.1 + 1.5) + 0.4 * Math.sin(t * 0.25 + p * 2.1);
        const x = 0.5 + cx + wx * 0.08;
        const y = 0.5 + cy + wy * 0.08;
        const z = 0.5 + cz + wz * 0.08;
        mcubes.addBall(x, y, z, strength, subtract);
      }

      // ── Pinch-off balls (indices 4, 5) — each follows a state cycle.
      // The cycle uses smoothstep-shaped easing: smooth glide out and back.
      for (let j = 0; j < 2; j++) {
        const i = 4 + j;
        const period = PINCH_PERIOD[j];
        const phase = PINCH_PHASE[j];
        const cycle = ((t + phase) % period) / period; // [0, 1)
        // Cycle shape:
        //   [0.00, 0.30] — in cluster (near centre)
        //   [0.30, 0.45] — elongating outward (smooth ease out)
        //   [0.45, 0.70] — drifting in the background (full detached)
        //   [0.70, 0.85] — returning (smooth ease back)
        //   [0.85, 1.00] — back in cluster
        let detach: number;
        if (cycle < 0.30) {
          detach = 0;
        } else if (cycle < 0.45) {
          const u = (cycle - 0.30) / 0.15;
          detach = u * u * (3 - 2 * u); // smoothstep
        } else if (cycle < 0.70) {
          detach = 1;
        } else if (cycle < 0.85) {
          const u = 1 - (cycle - 0.70) / 0.15;
          detach = u * u * (3 - 2 * u);
        } else {
          detach = 0;
        }
        // Add small wave so even when "in cluster" it has its own wiggle.
        const p = phases[i];
        const wx = Math.sin(t * 0.45 + p * 1.7) * 0.06;
        const wy = Math.sin(t * 0.38 + p * 2.3) * 0.06;
        const wz = Math.sin(t * 0.42 + p * 1.1) * 0.05;
        const dir = pinchDir(j, t);
        // While "fully detached" (during the drift phase, cycle 0.45–0.70),
        // the metablob also free-floats: an orbital wander around the
        // detached position. This is the "floating away as a free
        // metablob" character the lava-lamp needs — without it the
        // detached piece just hangs at a fixed offset until it pulls
        // back. Wander amplitude scales with `detach` so the ball is
        // anchored at the cluster early in the cycle and only starts
        // wandering once it's fully separated.
        const wanderX = Math.sin(t * 0.55 + p * 2.3) * 0.10 * detach;
        const wanderY = Math.cos(t * 0.50 + p * 1.7) * 0.08 * detach;
        const wanderZ = Math.sin(t * 0.45 + p * 1.1) * 0.07 * detach;
        // Detach distance 0.65 in field space — pushes the metablob
        // visibly far from the cluster centre. Combined with the wander
        // and the slow rotation of pinch directions, each cycle the
        // pinched-off piece explores a different part of the marching-
        // cubes grid before being absorbed back.
        const x = 0.5 + cx + wx + dir[0] * detach * 0.65 + wanderX;
        const y = 0.5 + cy + wy + dir[1] * detach * 0.65 + wanderY;
        const z = 0.5 + cz + wz + dir[2] * detach * 0.65 + wanderZ;
        // Lower strength on the pinch-off ball so the connecting bridge
        // thins faster as it stretches — gives the classic lava-lamp
        // "neck pinch" instead of a fat sausage staying connected.
        mcubes.addBall(x, y, z, strength * 0.75, subtract);
      }

      // MarchingCubes doesn't auto-update on render — explicit polygonize.
      mcubes.update();
    };

    // Drift the WHOLE MESH across the right ~⅔ of the banner — anchor
    // 2.0 + dx range ±1.9 puts the blob's drift between x≈0.1 (just
    // clear of title space) and x≈3.9 (deep into the right portion of
    // the banner, approaching the right edge). Vertical drift fills
    // most of the banner height.
    //
    // Phases on the y-drift sines are tuned so dy(0) ≈ -0.22 — the
    // blob enters the page in the lower portion of the banner and
    // gradually drifts up through its cycle, rather than starting at
    // the top.
    const meshAnchorX = 2.0;
    const meshAnchorY = 0.0;
    const updateMeshPosition = (t: number) => {
      const dx = 1.30 * Math.sin(t * 0.09) + 0.60 * Math.sin(t * 0.16 + 1.4);
      const dy = 0.40 * Math.sin(t * 0.12 + 3.7) + 0.18 * Math.cos(t * 0.08 + 1.65);
      mcubes.position.set(meshAnchorX + dx, meshAnchorY + dy, 0);
    };

    // Throttle the expensive marching-cubes polygonize to 30Hz.
    const MC_UPDATE_INTERVAL = 1 / 30;
    let lastMcUpdate = -1;

    // Intro: the blob smoothly grows from a speck (scale 0) to its full
    // target scale over INTRO_DUR seconds with an ease-out cubic curve,
    // so it feels like it materialises rather than popping in.
    const INTRO_DUR = 1.4;

    const animate = () => {
      if (!running) return;
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (t - lastMcUpdate >= MC_UPDATE_INTERVAL) {
        updateBalls(t);
        lastMcUpdate = t;
      }
      updateMeshPosition(t);
      // Intro scale-up: 0 → TARGET_SCALE over INTRO_DUR with ease-out-cubic.
      const introT = Math.min(1, t / INTRO_DUR);
      const eased = 1 - Math.pow(1 - introT, 3);
      mcubes.scale.setScalar(TARGET_SCALE * eased);
      // Slow rotation drifts env reflections across the surface.
      mcubes.rotation.y = t * 0.08;
      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      updateBalls(0);
      updateMeshPosition(0);
      mcubes.scale.setScalar(TARGET_SCALE); // skip intro animation
      renderer.render(scene, camera);
    } else {
      animate();
    }

    const onVisibility = () => {
      if (document.hidden) clock.stop();
      else clock.start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      mcubes.geometry.dispose();
      material.dispose();
      envMapRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} className="project-hero-blob" aria-hidden="true" />;
}
