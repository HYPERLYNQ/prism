/**
 * One-shot: reconstruct components/proto/ProtoHero.tsx from the compiled Next
 * dev chunk (the original source was deleted before being committed; the dev
 * build cache preserved it unminified). De-Turbopackifies the module refs into
 * clean imports. Run from site/:  node scripts/recover-proto.mjs
 */
import fs from "node:fs";

const CHUNK = ".next/dev/static/chunks/components_10x.lq.._.js";
const OUT = "components/proto/ProtoHero.tsx";

let s = fs.readFileSync(CHUNK, "utf8");

// Slice the proto module-level decls + the function.
const fi = s.indexOf("function ProtoHero");
let start = s.lastIndexOf("const SCROLL_PAGES", fi);
if (start < 0) start = fi;
let end = s.indexOf("_s(ProtoHero", fi);
if (end < 0) end = s.indexOf("_c = ProtoHero", fi);
let body = s.slice(start, end);

// Decode a Turbopack $-hex segment to its real path.
const dec = (t) =>
  t
    .replace(/\$5b\$/g, "[").replace(/\$5d\$/g, "]").replace(/\$2f\$/g, "/")
    .replace(/\$2e\$/g, ".").replace(/\$28\$/g, "(").replace(/\$29\$/g, ")")
    .replace(/\$2d\$/g, "-").replace(/\$24\$/g, "$").replace(/\$3c\$/g, "<")
    .replace(/\$3e\$/g, ">").replace(/\$2b\$/g, "+").replace(/\$/g, "");

// Map a decoded module path → { alias, key→localName }.
const usedThree = new Set();
const usedReact = new Set();
const usedAddon = {}; // path → Set(keys)
const usedScene = {}; // module → Set(keys)
let usesJsxDev = false;

// Replace refs. Two passes so we only consume the closing paren that belongs
// to a `(0, ref)` call-wrapper — never one that belongs to the enclosing call.
const map = (enc, key) => {
  const path = dec(enc);
  if (path.includes("react/jsx-dev-runtime")) { usesJsxDev = true; return "_jsxDEV"; }
  if (path.includes("react/index")) { usedReact.add(key); return key; }
  if (path.includes("three/build/three")) { usedThree.add(key); return `THREE.${key}`; }
  if (path.includes("/addons/") || path.includes("three/examples/jsm/")) {
    // three/examples/jsm/X is the same as three/addons/X. Cut the trailing
    // __[app-client]__(ecmascript) build suffix at the .js.
    const tail = path.split(/three\/(?:examples\/jsm|addons)\//)[1];
    const spec = "three/addons/" + tail.slice(0, tail.indexOf(".js") + 3);
    (usedAddon[spec] ||= new Set()).add(key);
    return key;
  }
  // hero scene modules: components/hero/sceneX.ts
  const mod = (path.match(/components\/hero\/(scene[A-Za-z]+)\.ts/) || [])[1];
  if (mod) { (usedScene[mod] ||= new Set()).add(key); return key; }
  // fallback — leave a clearly-broken marker so we notice
  return `/*UNMAPPED:${path}.${key}*/${key}`;
};
// Pass 1: `(0, ref)` wrappers — consume the matching closing paren.
body = body.replace(
  /\(0,\s*__TURBOPACK__imported__module__([A-Za-z0-9$_]+?)__\["([A-Za-z0-9_]+)"\]\)/g,
  (m, enc, key) => map(enc, key),
);
// Pass 2: bare refs — no paren to consume.
body = body.replace(
  /__TURBOPACK__imported__module__([A-Za-z0-9$_]+?)__\["([A-Za-z0-9_]+)"\]/g,
  (m, enc, key) => map(enc, key),
);

// Drop refresh/HMR noise.
body = body.replace(/_s\(\);\s*/g, "").replace(/var _c;?/g, "");

// Build imports. @ts-nocheck goes FIRST (before the "use client" directive) so
// TS skips the whole file — the compiled JS lost its annotations.
const lines = [
  "// @ts-nocheck — recovered from the Next dev build cache (original source was",
  "// deleted before being committed). The compiled JS lost its TS annotations,",
  "// so type-checking is disabled; the logic is the working prototype verbatim.",
  "// Regenerate with: node scripts/recover-proto.mjs",
  '"use client";',
  "",
];
const reactHooks = [...usedReact].sort();
if (reactHooks.length) lines.push(`import { ${reactHooks.join(", ")} } from "react";`);
if (usesJsxDev) lines.push(`import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";`);
lines.push(`import * as THREE from "three";`);
for (const [spec, keys] of Object.entries(usedAddon)) {
  lines.push(`import { ${[...keys].join(", ")} } from "${spec}";`);
}
const sceneImport = (mod, keys) => `import { ${[...keys].sort().join(", ")} } from "../hero/${mod}";`;
for (const [mod, keys] of Object.entries(usedScene)) lines.push(sceneImport(mod, keys));
lines.push("");
lines.push(body.trimEnd());
lines.push("");
lines.push("export default ProtoHero;");

fs.writeFileSync(OUT, lines.join("\n"));
console.log(
  `wrote ${OUT}\n  three keys: ${usedThree.size}\n  addons: ${Object.keys(usedAddon).join(", ")}\n  scene mods: ${Object.keys(usedScene).join(", ")}\n  unmapped: ${(body.match(/UNMAPPED/g) || []).length}`,
);
