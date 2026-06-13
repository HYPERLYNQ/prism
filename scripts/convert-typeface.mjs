/**
 * Convert Space Grotesk Bold (WOFF from @fontsource) into the three.js
 * `typeface.json` format consumed by FontLoader/TextGeometry — same encoding
 * facetype.js produces. One-shot:
 *
 *   node scripts/convert-typeface.mjs
 *
 * Writes public/fonts/space-grotesk_bold.typeface.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

// Defaults convert Space Grotesk Bold; pass src/out to convert anything else:
//   node scripts/convert-typeface.mjs <src.woff> <out.typeface.json>
const SRC = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(
      import.meta.dirname,
      "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff",
    );
const OUT = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.resolve(import.meta.dirname, "../public/fonts/space-grotesk_bold.typeface.json");

// Printable ASCII — covers every phrase the hero cycles plus anything new.
const CHARSET = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");

const buf = readFileSync(SRC);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

// facetype.js scaling: outlines normalized to a 1000-unit em grid ×100
// (three.js divides by `resolution` and multiplies by `size` at build time).
const scale = (1000 * 100) / ((font.unitsPerEm || 2048) * 72);
const round = Math.round;

const glyphs = {};
for (const char of CHARSET) {
  const glyph = font.charToGlyph(char);
  if (!glyph) continue;
  // Raw font-unit outline (y-up — exactly what three.js Font expects after
  // scaling). NOTE three.js's `o` token order puts the DESTINATION first:
  //   q x y x1 y1          (end point, then control)
  //   b x y x1 y1 x2 y2    (end point, then both controls)
  const token = [];
  for (const cmd of glyph.path.commands) {
    if (cmd.type === "M") token.push("m", round(cmd.x * scale), round(cmd.y * scale));
    else if (cmd.type === "L") token.push("l", round(cmd.x * scale), round(cmd.y * scale));
    else if (cmd.type === "Q")
      token.push("q", round(cmd.x * scale), round(cmd.y * scale), round(cmd.x1 * scale), round(cmd.y1 * scale));
    else if (cmd.type === "C")
      token.push(
        "b",
        round(cmd.x * scale), round(cmd.y * scale),
        round(cmd.x1 * scale), round(cmd.y1 * scale),
        round(cmd.x2 * scale), round(cmd.y2 * scale),
      );
    else if (cmd.type === "Z") token.push("z");
  }
  glyphs[char] = {
    ha: round(glyph.advanceWidth * scale),
    x_min: round((glyph.xMin ?? 0) * scale),
    x_max: round((glyph.xMax ?? 0) * scale),
    o: token.join(" "),
  };
}

const out = {
  glyphs,
  familyName: "Space Grotesk",
  ascender: round(font.ascender * scale),
  descender: round(font.descender * scale),
  underlinePosition: round((font.tables.post?.underlinePosition ?? -100) * scale),
  underlineThickness: round((font.tables.post?.underlineThickness ?? 50) * scale),
  boundingBox: {
    yMin: round(font.tables.head.yMin * scale),
    xMin: round(font.tables.head.xMin * scale),
    yMax: round(font.tables.head.yMax * scale),
    xMax: round(font.tables.head.xMax * scale),
  },
  resolution: 1000,
  original_font_information: { format: 0, fontFamily: "Space Grotesk", fontSubfamily: "Bold" },
};

writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${OUT} — ${Object.keys(glyphs).length} glyphs`);
