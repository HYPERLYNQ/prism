/**
 * One-shot: convert the freshly-captured hotship PNGs into the gallery's
 * webp pair (full-size master + 960w variant) in public/work/hotship/.
 *
 *   node scripts/convert-hotship-shots.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "D:/Coding/hotship/scripts";
const OUT = path.resolve(import.meta.dirname, "../public/work/hotship");

const SHOTS = [
  ["shot-01-dashboard.png", "01-dashboard"],
  ["shot-02-history.png", "02-history"],
  ["shot-03-new-shipment.png", "03-new-shipment"],
];

await mkdir(OUT, { recursive: true });

for (const [src, base] of SHOTS) {
  const input = path.join(SRC, src);
  const master = path.join(OUT, `${base}.webp`);
  const small = path.join(OUT, `${base}-960.webp`);
  await sharp(input).webp({ quality: 82 }).toFile(master);
  await sharp(input).resize({ width: 960 }).webp({ quality: 80 }).toFile(small);
  console.log(`${base}: master + 960 written`);
}
