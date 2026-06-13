/**
 * Type contracts shared between the hero's React component and the imperative
 * three.js scene that runs inside its useEffect. The scene exposes its only public
 * surface — the four imperative setters — through a `SceneApi` ref.
 */

import type { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import type { MatName, Swatch } from "@/lib/looks";

/**
 * How the whole scene is rendered. `solid` is the default chrome render;
 * `points` swaps every surface for a sampled dot-cloud; `ascii` re-renders
 * the scene as live character art (with the wordmark faces kept solid for
 * readability). The three modes are mutually exclusive.
 */
export type RenderMode = "solid" | "points" | "ascii";

/**
 * Imperative handle the scene exposes to the React layer. The picker UI updates
 * React state for its own rendering AND calls these methods to push the change
 * into the three.js world (which lives in a closure and can't be re-rendered).
 */
export type SceneApi = {
  setMaterial: (name: MatName) => void;
  setBgColor: (s: Swatch) => void;
  setHeroColor: (s: Swatch) => void;
  setDebrisColor: (s: Swatch) => void;
  /** Render mode — solid / points / ascii. Mutually exclusive. */
  setRenderMode: (mode: RenderMode) => void;
  /** Drop the debris under gravity (true) or spring it home (false). */
  setGravity: (on: boolean) => void;
  /** Scene-time slow motion — only meaningful while gravity is on. */
  setSloMo: (on: boolean) => void;
};

/**
 * One built glyph during phrase layout — geometry plus its measured width (which
 * differs from the font's natural `ha` advance because of the bevel).
 */
export type Glyph = { geo: TextGeometry; w: number };
