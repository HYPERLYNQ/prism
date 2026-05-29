"use client";

import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_FINISH,
  DEFAULT_SWATCH,
  SWATCHES,
  type MatName,
  type Swatch,
} from "@/lib/looks";
import { useHeroScene } from "./hero/useHeroScene";
import LookConsole from "./hero/LookConsole";
import HomeBlurb from "./hero/HomeBlurb";
import HomeCredentials from "./hero/HomeCredentials";
import type { SceneApi } from "./hero/sceneTypes";

/**
 * The landing-page hero — a WebGL scene of floating debris around a cycling
 * 3-D wordmark, with three overlay pieces around the scene:
 *
 *   • Bottom-left:    HomeBlurb — plain-language pitch
 *   • Bottom-center:  LookConsole — picker for finish + bg + hero + debris tints
 *   • Bottom-right:   HomeCredentials — shipped-work credentials
 *
 * The Masthead at the top of the page is rendered by `app/page.tsx`, not by
 * Hero — Hero only owns what sits IN the WebGL canvas's viewport.
 *
 * Hero is the orchestrator: holds picker state, owns the canvas ref, and
 * delegates the three.js scene to `useHeroScene`. The scene exposes an
 * imperative API on `apiRef` so the LookConsole's callbacks mutate the
 * three.js world directly without re-rendering React.
 */
export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<SceneApi | null>(null);

  /* ── picker state — duplicated to React for rendering, pushed to the scene via apiRef ── */
  const [finish, setFinish] = useState<MatName>(DEFAULT_FINISH);
  const [bgColorName, setBgColorName] = useState<string>(DEFAULT_SWATCH);
  const [heroColorName, setHeroColorName] = useState<string>("ink");
  const [debrisColorName, setDebrisColorName] = useState<string>("ink");

  /* ── UI flags ── */
  const [ready, setReady] = useState(false);
  const [moved, setMoved] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  /* ── set up the scene once on mount; the React layer pushes updates via apiRef ── */
  const handleReady = useCallback(() => setReady(true), []);
  const handleFirstMove = useCallback(() => setMoved(true), []);
  const handleError = useCallback(() => {
    setWebglFailed(true);
    setReady(true);
  }, []);
  useHeroScene(canvasRef, apiRef, handleReady, handleFirstMove, handleError);

  /* ── picker callbacks — update both React state and the imperative scene API ── */
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

  /* ── current-selection hex lookups for the inline swatch dots in LookConsole ── */
  const bgHex = SWATCHES.find((s) => s.name === bgColorName)?.hex ?? "#FFFFFF";
  const heroHex = SWATCHES.find((s) => s.name === heroColorName)?.hex ?? "#0A0E14";
  const debrisHex = SWATCHES.find((s) => s.name === debrisColorName)?.hex ?? "#0A0E14";

  return (
    <div className={`hero-root${webglFailed ? " webgl-failed" : ""}${ready ? " is-ready" : ""}`}>
      <h1 className="sr-only">Mike Vidal — AI Engineer</h1>
      {/* Crawlable description — the hero's value-prop phrases are WebGL geometry,
          not DOM text, so without this the home page has almost no indexable copy. */}
      <p className="sr-only">
        Applied-AI engineer based in Miami, open to remote. I ship LLM-powered
        systems to production — multi-stage pipelines, tool-use, structured
        output, and human-in-the-loop workflows — building real, deployed
        products rather than demos.
      </p>

      <canvas ref={canvasRef} className="hero-canvas" />

      {/* Visual fallback when WebGL can't init — the 3D wordmark carries the
          value-prop, so without the canvas we paint it as plain type instead of
          leaving a blank stage. (The sr-only copy above covers SEO / a11y.) */}
      {webglFailed && (
        <div className="hero-fallback" aria-hidden="true">
          <p className="hero-fallback-line">
            Applied AI,<br />shipped to production.
          </p>
        </div>
      )}

      {/* Cursor hint — fades once the user moves the mouse. */}
      <div className={`hero-hint${ready ? " in" : ""}${moved ? " gone" : ""}`}>
        move your cursor · click the wordmark
      </div>

      {/* Loader — fades when the scene reports ready. */}
      <div className={`hero-loader${ready ? " gone" : ""}`}>initializing</div>

      {/* Bottom-left blurb. */}
      <HomeBlurb />

      {/* Bottom-center Look console — picker for the scene's materials/colors. */}
      <LookConsole
        finish={finish}
        bgColorName={bgColorName}
        heroColorName={heroColorName}
        debrisColorName={debrisColorName}
        bgHex={bgHex}
        heroHex={heroHex}
        debrisHex={debrisHex}
        onPickFinish={pickFinish}
        onPickBg={pickBg}
        onPickHero={pickHero}
        onPickDebris={pickDebris}
      />

      {/* Bottom-right shipped-work credentials. */}
      <HomeCredentials />
    </div>
  );
}
