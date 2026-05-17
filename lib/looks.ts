/**
 * Shared "look" data for the hero — the seven material finishes, the twelve colour
 * swatches, the cycling lines on the wordmark, and the picker defaults.
 *
 * This file is just data. The picker UI (`LookPanel.tsx`) and the three.js scene
 * (`useHeroScene.ts` and friends) both consume these constants — keeping them
 * here means they can't drift out of sync.
 */

/** The seven material finishes the user can pick from. */
export type MatName = "chrome" | "gold" | "iris" | "crystal" | "candy" | "neon" | "matte";

/** One finish entry rendered as a chip in the picker. */
export type FinishOption = { id: MatName; label: string };

/** The seven finishes, in display order. */
export const FINISHES: FinishOption[] = [
  { id: "chrome", label: "chrome" },
  { id: "gold", label: "gold" },
  { id: "iris", label: "iris" },
  { id: "crystal", label: "crystal" },
  { id: "candy", label: "candy" },
  { id: "neon", label: "neon" },
  { id: "matte", label: "matte" },
];

/**
 * One colour swatch. The same swatches appear in all three colour rows
 * (background / hero / debris); each row tracks its own selection independently.
 */
export type Swatch = {
  /** Internal id and human label (shown via the `title` attribute on the button). */
  name: string;
  /** Primary colour. */
  hex: string;
  /** Slightly darker companion — used at the bottom of the page-bg gradient. */
  deep: string;
  /** Set when the swatch is dark enough that the UI needs the inverted text palette. */
  dark: boolean;
};

/**
 * The ten swatches that power the entire site palette, in display order.
 *
 * Curated down from the original twelve to a tighter, more deliberate set:
 *
 *   • 6 project accents — `chartreuse / deep-teal / burnt-orange / oxblood /
 *     aubergine / gold-leaf`. Each one is locked to a specific project (see
 *     `Project.accent` in `projects.ts`). Atelier-moderne family — confident
 *     mid-tones with unusual hue choices. Refined but with character.
 *   • 4 neutrals — `white / off-white / grey / ink`. Used for backgrounds
 *     and dark-mode toggles.
 *
 * Direction is "atelier moderne" — saturated enough to read as deliberate,
 * unusual enough to feel designed (not the basic primary/secondary spread).
 * `deep` companions go ~30–35% darker for banner-gradient depth.
 *
 * `dark` is set on swatches dark enough that the banner needs white text
 * (the `.is-dark` modifier inverts the banner text colour). Aubergine and
 * oxblood are genuinely dark — black title type fails contrast on them.
 */
export const SWATCHES: Swatch[] = [
  { name: "chartreuse",   hex: "#9DA840", deep: "#6B7320", dark: false },
  { name: "deep-teal",    hex: "#2E7D7A", deep: "#1B5754", dark: true  },
  { name: "burnt-orange", hex: "#D86B3C", deep: "#A04A23", dark: false },
  { name: "oxblood",      hex: "#A0394A", deep: "#6C232F", dark: true  },
  { name: "aubergine",    hex: "#5B3A6E", deep: "#3D2349", dark: true  },
  { name: "gold-leaf",    hex: "#C99B36", deep: "#8E6A1E", dark: false },
  { name: "white",        hex: "#FFFFFF", deep: "#EFEEE8", dark: false },
  { name: "off-white",    hex: "#FAFAF7", deep: "#E8E5DE", dark: false },
  { name: "grey",         hex: "#9DA2A6", deep: "#73787F", dark: false },
  { name: "ink",          hex: "#0A0E14", deep: "#040608", dark: true  },
];

/** Default finish when the page first loads. */
export const DEFAULT_FINISH: MatName = "chrome";
/** Default background swatch when the page first loads. */
export const DEFAULT_SWATCH = "white";

/**
 * Cycling phrases on the wordmark. Short, accurate to what he does — he puts AI to
 * work in production. No name on the type; no "agents" overclaim. `\n` = line break.
 */
export const PHRASES: string[] = [
  "ai doesn't\ntake my job.\ni give it one",
  "the ai works.\ni checked.",
  "ai, fully\nassembled",
  "i ship what\nothers demo",
  "ai with\na day job",
  "hire me before\nyour ai does",
];
