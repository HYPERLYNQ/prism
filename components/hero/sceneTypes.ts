/**
 * Type contracts shared between the hero's React component and the imperative
 * three.js scene that runs inside its useEffect. The scene exposes its only public
 * surface — the four imperative setters — through a `SceneApi` ref.
 */

import type { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import type { MatName, Swatch } from "@/lib/looks";

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
};

/**
 * One built glyph during phrase layout — geometry plus its measured width (which
 * differs from the font's natural `ha` advance because of the bevel).
 */
export type Glyph = { geo: TextGeometry; w: number };
