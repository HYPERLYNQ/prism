/**
 * Tunable constants for the hero scene. Every number that used to be a magic literal
 * inside the animate loop or scene-setup code lives here, named and documented, so the
 * camera feel / debris density / phrase pacing can be adjusted without spelunking.
 *
 * Sections:
 *   • CAMERA       — perspective, fly-in start, where the camera looks
 *   • DEBRIS       — how many pieces, how they're spread on the surrounding shell
 *   • WORDMARK     — text size and per-letter layout spacing
 *   • ANIMATION    — every lerp/ease used in the per-frame loop
 *   • PHRASES      — timing of the cycling line transitions
 *   • SCATTER      — the click-to-explode-letters interaction
 *   • POSTPROCESS  — bloom strength / radius / threshold
 *   • NEON         — fallback colour for desaturated tints so neon never disappears
 */

/* ── CAMERA ───────────────────────────────────────────────────────── */
/** Camera's far-clip plane and the unit used for the off-screen fly-in start. */
export const FAR = 10_000;
/**
 * Resting Z of the camera at the reference viewport width (`BASE_Z_REF_WIDTH`).
 * Below that width, the camera is pulled back proportionally — see `computeBaseZ`
 * — so the wordmark stays inside the frame instead of clipping at the edges.
 */
export const BASE_Z = 1700;
/** Viewport width at which `BASE_Z` is "correct" without adjustment. */
export const BASE_Z_REF_WIDTH = 1440;
/** Z is clamped to this maximum so very narrow screens don't ship the camera to infinity. */
export const BASE_Z_MAX = 4200;

/**
 * Pull the camera back proportionally on narrow viewports so the wordmark
 * keeps comfortable margin instead of bleeding past the frame edges.
 *
 *   wider  → uses `BASE_Z` directly
 *   narrow → `BASE_Z * (refWidth / viewportWidth)`, clamped at `BASE_Z_MAX`
 */
export function computeBaseZ(viewportWidth: number): number {
  if (viewportWidth >= BASE_Z_REF_WIDTH) return BASE_Z;
  return Math.min(BASE_Z_MAX, BASE_Z * (BASE_Z_REF_WIDTH / viewportWidth));
}
/** Vertical FOV in degrees. */
export const FOV_DEG = 35;
/** Where the camera looks. Slightly off-centre for a less symmetric composition. */
export const LOOK_TARGET: readonly [number, number, number] = [-60, 0, 0];
/** Per-frame lerp factor for the cursor → camera follow (ilithya's value). */
export const CAM_FOLLOW = 0.035;
/** Cursor amplitude multiplier (`mouseX = MOUSE_AMP * (clientX - W/2)`). */
export const MOUSE_AMP = 4;

/* ── DEBRIS ───────────────────────────────────────────────────────── */
/** Spherical shell of debris around the wordmark — inner radius. */
export const SHELL_IN = 1000;
/** Spherical shell of debris around the wordmark — outer radius. */
export const SHELL_OUT = 4200;
/** A debris piece is rejected if it lands closer than this to the camera-rest point. */
export const CAM_CLEAR = 2000;
/** Minimum angular separation (≈5.2°) between two debris pieces, expressed as a dot-product floor. */
export const MIN_DEBRIS_DOT = Math.cos(0.09);
/** Total instanced pieces across all six shapes (desktop, round-robin distributed). */
export const DEBRIS_TOTAL = 320;
/** Total instanced pieces on narrow viewports — fewer pieces for mobile GPUs. */
export const DEBRIS_TOTAL_MOBILE = 140;
/** Viewports narrower than this use the mobile performance branch. */
export const MOBILE_BREAKPOINT = 720;
/** Per-piece random scale range — [min, span]. Final scale = min + Math.random() * span. */
export const DEBRIS_SCALE_MIN = 0.7;
export const DEBRIS_SCALE_SPAN = 0.35;

/* ── WORDMARK ─────────────────────────────────────────────────────── */
/** TextGeometry size — drives every other wordmark dimension. */
export const WORDMARK_SIZE = 132;
/** Line height as a multiple of WORDMARK_SIZE. */
export const WORDMARK_LINE_H = WORDMARK_SIZE * 1.18;
/** Gap between glyphs (tighter than the font's natural advance because of bevel). */
export const WORDMARK_GAP = WORDMARK_SIZE * 0.02;
/** Width of a word-space. */
export const WORDMARK_SPACE = WORDMARK_SIZE * 0.4;
/** Drop the whole letter stack down by this much so its visual centre ≈ origin. */
export const WORDMARK_BLOCK_SHIFT_Y = -WORDMARK_SIZE * 0.3;
/** Extrude/bevel settings shared by every glyph. */
export const WORDMARK_EXTRUDE = {
  size: WORDMARK_SIZE,
  depth: 120,
  curveSegments: 8,
  bevelEnabled: true,
  bevelThickness: 9,
  bevelSize: 5,
  bevelOffset: 0,
  bevelSegments: 5,
} as const;

/* ── ANIMATION ────────────────────────────────────────────────────── */
/** Whole-scene "breathing" rotation amplitude (radians). Ilithya's value. */
export const BREATH_AMP = 0.3;
/** How the visible-phrase opacity is lerped toward its fade target each frame. */
export const OPACITY_LERP = 0.22;
/** Maximum dt (s) per frame — clamps the spike when a long-hidden tab returns. */
export const MAX_DT = 0.05;

/* ── PHRASES ──────────────────────────────────────────────────────── */
/** Seconds a phrase is fully shown before the next one is cycled in. */
export const PHRASE_DUR = 6.6;
/** Seconds of fade-in / fade-out at each end of a phrase. */
export const PHRASE_FADE = 0.6;

/* ── SCATTER (click-the-wordmark interaction) ────────────────────── */
/** Seconds the letters drift around after a click before they regroup. */
export const SCATTER_HOLD = 5.0;
/** Seconds the letters take to return to their home positions. */
export const REGROUP_DUR = 1.7;
/** Per-frame velocity damping during scatter (smaller = faster drift to rest). */
export const VEL_DAMP = 0.16;
/** Per-frame spring-back factor during regroup (smaller = snappier return). */
export const REGROUP_SPRING = 0.012;
/** Letters clamp back inside this radius if they fling too far. */
export const SCATTER_CLAMP = 2600;
/** Base outward velocity of a scattered letter (units/sec). */
export const SCATTER_VEL_MIN = 420;
export const SCATTER_VEL_SPAN = 520;

/* ── POSTPROCESS (UnrealBloomPass) ───────────────────────────────── */
/**
 * Bloom is only enabled when the neon finish is active.
 *
 * The size of the halo is driven by how far the emissive pixel sits ABOVE
 * `BLOOM_THRESHOLD` (over-threshold amplitude × `BLOOM_STRENGTH` × the blur
 * kernel). The neon material is tuned so every tint lands at a small,
 * uniform delta above the threshold — that keeps the bloom as a soft rim
 * rather than the cloud halo a large delta would produce.
 */
/* Bloom strength softened (was 0.18 → 0.14, ~22% reduction) so the neon
 * halo reads as a clean rim rather than a glow puddle. Same look across all
 * tints, just less aggressive. */
export const BLOOM_STRENGTH = 0.14;
export const BLOOM_RADIUS = 0.06;
export const BLOOM_THRESHOLD = 0.22;

/* ── NEON ─────────────────────────────────────────────────────────── */
/** Fallback colour when the picked tint is too desaturated to read as neon. */
export const NEON_FALLBACK_HEX = "#FF36AB";
/** HSL saturation below this is considered "neutral" → triggers the fallback. */
export const NEON_MIN_SATURATION = 0.18;

/**
 * Per-tint `emissiveIntensity` for the neon finish is computed using a **dual
 * cap** so the letters always render as their picked colour AND the bloom
 * contribution stays modest enough to keep the text readable.
 *
 * The math (in `sceneMaterials.ts → computeNeonIntensity`):
 *     lumaIntensity    = HERO_TARGET_LUMA / linearLuma(tint)
 *     channelIntensity = PEAK_CHANNEL     / max(r, g, b)
 *     intensity        = clamp(min(lumaIntensity, channelIntensity), MIN, MAX)
 *
 *   • The **luma cap** prevents bright tints (gold-leaf, chartreuse) from
 *     over-emitting and producing a cloud bloom.
 *   • The **peak-channel cap** prevents dim tints (deep-teal, aubergine) from
 *     pumping their dominant channel past 1.0 — that would saturate the
 *     letter interior to washed-out white. With the channel pinned just
 *     under 1.0, the letters stay clearly tinted and readable.
 *   • Trade-off: bright hues bloom slightly more than dim hues. With
 *     `BLOOM_STRENGTH` / `BLOOM_RADIUS` tuned small, that variance is
 *     visually negligible — readability is the priority.
 *
 * Rec 709 weights (0.2126, 0.7152, 0.0722) are used for the luma channel —
 * same formula `UnrealBloomPass` uses internally for its threshold extraction.
 */
export const NEON_HERO_TARGET_LUMA = 0.32;
/** Debris target stays strictly under `BLOOM_THRESHOLD` so debris glows
 * without contributing to the bloom halo. Dropped from 0.22 → 0.19 — at
 * exactly threshold, dim tints could nick the bloom pass at max intensity. */
export const NEON_DEBRIS_TARGET_LUMA = 0.19;
/**
 * Cap on the brightest channel of a neon pixel (linear), just below 1.0 so
 * after tonemap the letter interior reads as a clean tint rather than a
 * blown-out white. Lower number = more saturated colour, less "lit" feel.
 */
export const NEON_PEAK_CHANNEL = 0.88;
/**
 * Floor on `emissiveIntensity` returned by `computeNeonIntensity`. Lowered
 * from 0.7 → 0.4 so the debris computation (target luma 0.19) doesn't get
 * over-floored for bright tints. With MIN 0.7, a bright tint like chartreuse
 * computes wanted=0.54 → clamped UP to 0.7 → debris pixel luma = 0.355×0.7
 * = 0.249, which crosses BLOOM_THRESHOLD (0.22) and makes the debris
 * unintentionally bloom. At 0.4 the floor doesn't kick in for any of the
 * atelier accents on the debris path.
 */
export const NEON_MIN_INTENSITY = 0.4;
/**
 * Headroom for `computeNeonIntensity` to crank up dim tints (aubergine, oxblood)
 * enough to reach `NEON_HERO_TARGET_LUMA`. Bumped from 2.0 → 14 so the
 * channel-cap (`NEON_PEAK_CHANNEL / max(r,g,b)`) becomes the binding limit
 * for dim tints — without this, the arbitrary MAX clamped them ~3x below
 * target and they rendered without any visible bloom or debris emission.
 * Bright tints (chartreuse, gold-leaf) are already below 2.0 so they're
 * unaffected.
 */
export const NEON_MAX_INTENSITY = 14.0;
export const NEON_LUMA_FLOOR = 0.01;
