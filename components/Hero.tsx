"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_FINISH,
  DEFAULT_SWATCH,
  SWATCHES,
  type MatName,
  type Swatch,
} from "@/lib/looks";
import HeroOverlay from "./hero/HeroOverlay";
import { useHeroScene } from "./hero/useHeroScene";
import type { SceneApi } from "./hero/sceneTypes";

/**
 * The landing-page hero — a WebGL scene of floating debris around a cycling 3-D
 * wordmark, with an overlay UI for picking the look (finish + three independent
 * tints: bg, hero, debris).
 *
 * This file is a thin orchestrator:
 *   • holds the React state for which finish / swatches are picked + UI flags
 *   • owns the canvas + the top-left container refs
 *   • delegates the entire three.js world to `useHeroScene` (in `hero/`)
 *   • renders the canvas + `HeroOverlay`
 *
 * The actual scene logic, materials, debris, wordmark, postprocessing and animation
 * loop are split into focused modules under `components/hero/`.
 */
export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topLeftRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);

  /* ── picker state — duplicated to React for rendering, pushed to the scene via apiRef ── */
  const [finish, setFinish] = useState<MatName>(DEFAULT_FINISH);
  const [bgColorName, setBgColorName] = useState<string>(DEFAULT_SWATCH);
  const [heroColorName, setHeroColorName] = useState<string>("ink");
  const [debrisColorName, setDebrisColorName] = useState<string>("ink");

  /* ── UI flags ── */
  const [panelOpen, setPanelOpen] = useState(false);
  /** Scene-ready (font loaded, first phrase built) → fades the UI in + dismisses the loader. */
  const [ready, setReady] = useState(false);
  /** First cursor move detected → fades the hint out. */
  const [moved, setMoved] = useState(false);

  /* ── set up the scene once on mount; the React layer pushes updates via apiRef ── */
  const handleReady = useCallback(() => setReady(true), []);
  const handleFirstMove = useCallback(() => setMoved(true), []);
  useHeroScene(canvasRef, apiRef, handleReady, handleFirstMove);

  /* ── outside-click closes the look panel ── */
  useEffect(() => {
    if (!panelOpen) return;
    function onDocClick(e: MouseEvent) {
      const root = topLeftRef.current;
      if (root && !root.contains(e.target as Node)) setPanelOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [panelOpen]);

  /* ── picker callbacks — update both React state and the imperative scene API ── */
  const togglePanel = useCallback(() => setPanelOpen((open) => !open), []);
  const pickFinish = useCallback((id: MatName) => {
    setFinish(id);
    apiRef.current?.setMaterial(id);
  }, []);
  const pickBg = useCallback((swatch: Swatch) => {
    setBgColorName(swatch.name);
    apiRef.current?.setBgColor(swatch);
  }, []);
  const pickHero = useCallback((swatch: Swatch) => {
    setHeroColorName(swatch.name);
    apiRef.current?.setHeroColor(swatch);
  }, []);
  const pickDebris = useCallback((swatch: Swatch) => {
    setDebrisColorName(swatch.name);
    apiRef.current?.setDebrisColor(swatch);
  }, []);

  const bgHex = SWATCHES.find((s) => s.name === bgColorName)?.hex ?? "#FFFFFF";

  return (
    <div className="hero-root">
      <h1 className="sr-only">Michael Vidal — AI Engineer</h1>
      <canvas ref={canvasRef} className="hero-canvas" />
      <HeroOverlay
        topLeftRef={topLeftRef}
        ready={ready}
        moved={moved}
        panelOpen={panelOpen}
        togglePanel={togglePanel}
        finish={finish}
        bgColorName={bgColorName}
        heroColorName={heroColorName}
        debrisColorName={debrisColorName}
        bgHex={bgHex}
        onPickFinish={pickFinish}
        onPickBg={pickBg}
        onPickHero={pickHero}
        onPickDebris={pickDebris}
      />
    </div>
  );
}
