import * as THREE from "three";
import { type Font } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import {
  WORDMARK_BLOCK_SHIFT_Y,
  WORDMARK_EXTRUDE,
  WORDMARK_GAP,
  WORDMARK_LINE_H,
  WORDMARK_SPACE,
} from "./sceneConfig";
import type { Glyph } from "./sceneTypes";

/**
 * Builds a single phrase as an array of per-letter meshes, laid out across one or
 * more lines.
 *
 * The font's natural `ha` advance can't be used because the bevel inflates each
 * glyph wider than its advance — letters would overlap. Instead each glyph is
 * x-centred on the origin, its measured width is recorded, and the layout pass
 * walks a running x cursor (`cx`) with `width + GAP` per glyph and `SPACE` per
 * space character. All glyphs of one line share a baseline (no per-glyph Y
 * centring) so the line reads as one row.
 *
 * Every returned mesh is assigned to **layer 1** so the post-processing pipeline
 * can render it in its own pass on top of the debris (which lives on layer 0),
 * guaranteeing the logo is never occluded.
 */
export function buildPhrase(
  text: string,
  font: Font,
  material: THREE.Material,
): THREE.Mesh[] {
  const lines = text.split("\n");
  const lineCount = lines.length;

  // Pass 1: build every glyph's geometry (x-centred, baseline at y=0) and measure widths.
  const lineData = lines.map((line) => {
    const items: (Glyph | "space")[] = [];
    for (const ch of line) {
      if (ch === " ") {
        items.push("space");
        continue;
      }
      const geo = new TextGeometry(ch, { font, ...WORDMARK_EXTRUDE });
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const w = bb.max.x - bb.min.x;
      geo.translate(-(bb.min.x + bb.max.x) * 0.5, 0, 0); // x-centred; baseline stays at y=0
      items.push({ geo, w });
    }
    let width = 0;
    for (const it of items) width += it === "space" ? WORDMARK_SPACE : it.w + WORDMARK_GAP;
    if (items.length && items[items.length - 1] !== "space") width -= WORDMARK_GAP;
    return { items, width };
  });

  const blockWidth = Math.max(...lineData.map((l) => l.width), 1);

  // Pass 2: walk each line's x cursor, emit a Mesh per non-space item.
  const meshes: THREE.Mesh[] = [];
  for (let li = 0; li < lineCount; li++) {
    const baselineY =
      (lineCount - 1) * 0.5 * WORDMARK_LINE_H - li * WORDMARK_LINE_H + WORDMARK_BLOCK_SHIFT_Y;
    let cx = -blockWidth * 0.5;
    for (const item of lineData[li].items) {
      if (item === "space") {
        cx += WORDMARK_SPACE;
        continue;
      }
      // Two-material array so the ASCII hybrid mode can render the front/back
      // CAPS (group 0) as solid mirror faces while the extruded SIDES (group
      // 1) stay ASCII. In every other mode both groups share one material, so
      // this is identical to a single-material mesh. ExtrudeGeometry emits
      // group 0 = caps, group 1 = sides.
      const mesh = new THREE.Mesh(item.geo, [material, material]);
      mesh.layers.set(1); // own pass, drawn on top of debris (see sceneComposer)
      mesh.userData.home = new THREE.Vector3(cx + item.w * 0.5, baselineY, 0);
      mesh.userData.vel = new THREE.Vector3();
      mesh.userData.spin = new THREE.Vector3();
      mesh.userData.seed = Math.random() * 1000;
      mesh.position.copy(mesh.userData.home);
      meshes.push(mesh);
      cx += item.w + WORDMARK_GAP;
    }
  }
  return meshes;
}

/**
 * Reset every letter mesh in the phrase to its home position and rotation,
 * reassign the current material reference, and attach it under `wordRoot`.
 * Called when cycling to a new phrase or when the scatter animation regroups.
 */
export function attachPhraseToRoot(
  wordRoot: THREE.Group,
  meshes: THREE.Mesh[],
  material: THREE.Material,
): void {
  wordRoot.clear();
  for (const mesh of meshes) {
    mesh.position.copy(mesh.userData.home);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.setScalar(1);
    // Both geometry groups (caps + sides) share the one material — see the
    // note in buildPhrase. The ASCII hybrid overlay swaps these temporarily.
    mesh.material = [material, material];
    wordRoot.add(mesh);
  }
}
