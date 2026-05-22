"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { buildEnvScene } from "@/components/hero/sceneEnv";
import { makePreset } from "@/components/hero/sceneMaterials";

/**
 * The project page's proof point: a short tag (`v1.7.6`, `LIVE`, `BUILDING`)
 * extruded in 3D and rendered in the *same* mirror-chrome material + HDR studio
 * environment as the hero wordmark — so it reads as minted metal, not a flat
 * badge. Replaces the old `.project-status` pill.
 *
 * Reuses `buildEnvScene` (the contrasty HDR env that makes chrome actually
 * mirror) and `makePreset("chrome", …)` from the hero, so there's no material
 * duplication and the look matches the home page exactly.
 *
 * Performance: this is a *second* WebGL context on the project page (the banner
 * blob is the first), so it's kept deliberately cheap and well-behaved:
 *   • one small text mesh, one env bake — no per-frame allocations in the loop
 *   • capped pixel ratio
 *   • an IntersectionObserver pauses the rAF loop whenever the token scrolls
 *     out of view, so it never competes with the banner for the GPU
 *   • prefers-reduced-motion → a single static frame, no loop at all
 *   • full GPU teardown on unmount
 *
 * The visible text is WebGL geometry (not crawlable), so callers render the
 * longer `status` string beside it as the accessible/indexable caption.
 */

type ProjectProofTokenProps = {
  /** Short tag to extrude (e.g. "v1.7.6"). */
  text: string;
  /** Project accent hex — tints the chrome slightly toward the page accent. */
  tintHex: string;
};

export default function ProjectProofToken({ text, tintHex }: ProjectProofTokenProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block;";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(buildEnvScene(), 0.02);
    scene.environment = envRT.texture;

    const material = makePreset("chrome", tintHex);
    const group = new THREE.Group();
    scene.add(group);

    let mesh: THREE.Mesh | null = null;
    let disposed = false;
    let raf = 0;
    let visible = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const timer = new THREE.Timer();
    const render = () => renderer.render(scene, camera);
    const animate = () => {
      // Fully stop scheduling when off-screen (raf=0) rather than spinning the
      // loop to skip draws — the IntersectionObserver restarts it on re-entry.
      if (!visible) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(animate);
      timer.update();
      const t = timer.getElapsed();
      group.rotation.y = Math.sin(t * 0.5) * 0.45;
      group.rotation.x = Math.sin(t * 0.32) * 0.07;
      render();
    };

    new FontLoader().load("/fonts/helvetiker_bold.typeface.json", (font) => {
      if (disposed) return;
      const geo = new TextGeometry(text, {
        font,
        size: 1,
        depth: 0.34,
        curveSegments: 7,
        bevelEnabled: true,
        bevelThickness: 0.07,
        bevelSize: 0.045,
        bevelOffset: 0,
        bevelSegments: 4,
      });
      geo.center();
      mesh = new THREE.Mesh(geo, material);
      group.add(mesh);
      resize();
      if (reducedMotion) render();
      else animate();
    });

    // Pause the loop whenever the token is off-screen so it never competes with
    // the banner blob for the GPU.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !reducedMotion && !raf && !disposed) animate();
      },
      { threshold: 0 },
    );
    io.observe(container);
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mesh?.geometry.dispose();
      material.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [text, tintHex]);

  return <div ref={containerRef} className="project-proof-token" aria-hidden="true" />;
}
