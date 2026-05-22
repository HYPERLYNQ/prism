"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

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

    // Mobile detection — phones have weaker GPUs and tighter thermal/
    // battery budgets, so the blob runs lighter there: lower marching-
    // cubes resolution, capped pixel ratio, slower field-rebuild rate.
    // `pointer: coarse` + narrow viewport is a reliable phone signal.
    const isMobile =
      window.matchMedia("(max-width: 820px)").matches ||
      window.matchMedia("(pointer: coarse)").matches;

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
    // Mobile: cap pixel ratio at 1.5 (vs 2 on desktop) — halves the
    // fragment-shading load on high-DPR phone screens for a barely
    // perceptible quality difference at the banner's small size.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
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
    // Resolution: 80 on desktop, 48 on mobile. The polygonize cost scales
    // with resolution³, so 48 vs 80 is ~⅕ the per-frame CPU work — a big
    // win for phone battery/thermals. At the banner's small render size
    // on a phone screen, 48-cell facets still aren't visible.
    const mcResolution = isMobile ? 48 : 80;
    const mcubes = new MarchingCubes(mcResolution, material, false, false, 200000);
    mcubes.isolation = 80;
    // Target final scale. Starts at 0 (invisible) and eases up during the intro
    // (see INTRO_DUR below). A single base value — `responsiveScale` (in resize)
    // shrinks it continuously by the visible frustum width, so narrow banners
    // (tablet, mobile) already get a proportionally smaller blob without a
    // separate mobile constant. On a phone-width banner this lands near ~1.1.
    const TARGET_SCALE = 1.9;
    mcubes.scale.setScalar(0);
    // CRITICAL: stale bounding sphere at world origin would cull this mesh
    // out of frustum once we move it. Disable frustum culling outright.
    mcubes.frustumCulled = false;
    scene.add(mcubes);

    // ── Resize ───────────────────────────────────────────────────────
    // Visible half-extents of the frustum at the blob's z-plane (z=0). halfVisH
    // is aspect-independent (set by FOV + distance); halfVisW grows with aspect.
    // The blob is positioned/scaled as a FRACTION of these so it stays in the
    // right portion of the banner at any aspect — instead of using fixed world
    // coords that fall off the right edge on narrow/short (tablet) banners.
    // REF_HALF_W is the desktop-ish width at which TARGET_SCALE looks right;
    // narrower banners scale the blob down proportionally so it never overruns.
    const REF_HALF_W = 3.5;
    let halfVisH = Math.tan(((camera.fov * Math.PI) / 180) / 2) * camera.position.z;
    let halfVisW = halfVisH * camera.aspect;
    let responsiveScale = TARGET_SCALE;
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      halfVisH = Math.tan(((camera.fov * Math.PI) / 180) / 2) * camera.position.z;
      halfVisW = halfVisH * camera.aspect;
      responsiveScale = TARGET_SCALE * Math.min(1, Math.max(0.55, halfVisW / REF_HALF_W));
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
    // Scattered intro position for ball `i` in field space [0,1]. Spread via the
    // golden angle so the droplets distribute organically (not a mechanical
    // ring) across the field; radius kept ≤0.36 so each ball's influence stays
    // inside the marching-cubes grid (no edge clipping).
    const introScatter = (i: number): [number, number, number] => {
      const a = i * 2.39996; // golden angle
      const r = 0.30 + 0.06 * (i % 3);
      return [
        0.5 + Math.cos(a) * r,
        0.5 + Math.sin(a) * r * 0.82,
        0.5 + (i % 2 ? 0.15 : -0.15),
      ];
    };

    // `converge` (0→1) drives the coalescence intro: at 0 every ball sits at its
    // scattered start (separate droplets), at 1 it's at its normal animated
    // position (merged organism). Each ball lerps between the two.
    const updateBalls = (t: number, converge: number) => {
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
        const s = introScatter(i);
        mcubes.addBall(
          s[0] + (x - s[0]) * converge,
          s[1] + (y - s[1]) * converge,
          s[2] + (z - s[2]) * converge,
          strength,
          subtract,
        );
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
        const s = introScatter(i);
        mcubes.addBall(
          s[0] + (x - s[0]) * converge,
          s[1] + (y - s[1]) * converge,
          s[2] + (z - s[2]) * converge,
          strength * 0.75,
          subtract,
        );
      }

      // MarchingCubes doesn't auto-update on render — explicit polygonize.
      mcubes.update();
    };

    // Drift the WHOLE MESH around the banner. The desktop banner is wide
    // (camera horizontal half-FOV ≈ 5.4 world units) so the blob can
    // anchor right + drift far. The mobile banner is narrow (half-FOV
    // ≈ 2.1) — the same anchor/drift would carry the blob clean off the
    // right edge. So both the anchor and the drift amplitudes scale
    // down on mobile to keep the blob fully on-screen.
    //
    // Position the blob as a FRACTION of the visible frustum so it stays in
    // frame at every aspect ratio (desktop → tablet → mobile) instead of using
    // fixed world coords that fall off the right edge on narrow banners.
    //
    // Phases on the y-drift sines are tuned so dy(0) ≈ -0.22 — the blob enters
    // low and drifts up through its cycle. On mobile the title + tagline fill
    // the upper banner, so the vertical anchor tucks LOW (negative fraction)
    // into the open band beneath the text and the horizontal anchor pulls a
    // touch more central; on desktop it sits centred in the open right half.
    const xAnchorFrac = isMobile ? 0.42 : 0.5;
    const yAnchorFrac = isMobile ? -0.42 : 0.0;
    const xDriftFrac = isMobile ? 0.18 : 0.26;
    const yDriftFrac = isMobile ? 0.12 : 0.16;
    const updateMeshPosition = (t: number) => {
      // Normalised drift in ~[-1, 1], placed as a fraction of the visible frustum.
      const dxN = 0.68 * Math.sin(t * 0.09) + 0.32 * Math.sin(t * 0.16 + 1.4);
      const dyN = 0.7 * Math.sin(t * 0.12 + 3.7) + 0.3 * Math.cos(t * 0.08 + 1.65);
      const x = halfVisW * (xAnchorFrac + xDriftFrac * dxN);
      const y = halfVisH * (yAnchorFrac + yDriftFrac * dyN);
      mcubes.position.set(x, y, 0);
    };

    // Throttle the expensive marching-cubes polygonize: 30Hz on desktop,
    // 20Hz on mobile. The mesh translation + rotation still run every
    // rAF frame so motion stays smooth; only the field rebuild is
    // throttled. 20Hz is still smooth enough for the slow morph and cuts
    // another third off the mobile CPU cost.
    const MC_UPDATE_INTERVAL = isMobile ? 1 / 20 : 1 / 30;
    let lastMcUpdate = -1;

    // Intro: the blob coalesces from scattered iridescent droplets into the
    // merged organism over INTRO_DUR seconds. The droplets stream inward
    // (smoothstep `converge`) while the whole mesh eases up to full scale
    // (ease-out-cubic) — so it gathers itself into being rather than just
    // growing in place.
    const INTRO_DUR = 1.9;

    const animate = () => {
      if (!running) return;
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const introT = Math.min(1, t / INTRO_DUR);
      // Smoothstep convergence — slow at the start (droplets hang apart), fast
      // through the middle (they rush together), settling gently at the end.
      const converge = introT * introT * (3 - 2 * introT);
      if (t - lastMcUpdate >= MC_UPDATE_INTERVAL) {
        updateBalls(t, converge);
        lastMcUpdate = t;
      }
      updateMeshPosition(t);
      // Scale eases to full a touch ahead of convergence so the droplets are
      // visible at near-full size as they merge (ease-out-cubic). responsiveScale
      // shrinks the blob on narrow banners so it never overruns the frame.
      const scaleEase = 1 - Math.pow(1 - introT, 3);
      mcubes.scale.setScalar(responsiveScale * scaleEase);
      // Slow rotation drifts env reflections across the surface.
      mcubes.rotation.y = t * 0.08;
      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      updateBalls(0, 1); // fully merged, no coalescence
      updateMeshPosition(0);
      mcubes.scale.setScalar(responsiveScale); // skip intro animation
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
