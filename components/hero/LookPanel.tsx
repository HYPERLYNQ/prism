"use client";

import { FINISHES, SWATCHES, type MatName, type Swatch } from "@/lib/looks";

/**
 * Picker UI for the hero: a small collapsed "pill" button (`lookbtn`) that opens
 * a panel with four rows — finish, background, hero tint, debris tint.
 *
 * The component is purely presentational: it doesn't own any state of its own.
 * The parent (`Hero`) owns `panelOpen` and the four "name" strings, and supplies
 * pick callbacks that update both React state AND the imperative scene API.
 *
 * Swatch colours are bound through a CSS custom property (`--sw`) rather than an
 * inline `background:` — the actual `background: var(--sw)` rule lives in
 * `globals.css`. Same for the lookdot's background (`--dot-color`).
 */

type LookPanelProps = {
  panelOpen: boolean;
  togglePanel: () => void;
  finish: MatName;
  bgColorName: string;
  heroColorName: string;
  debrisColorName: string;
  bgHex: string;
  onPickFinish: (id: MatName) => void;
  onPickBg: (swatch: Swatch) => void;
  onPickHero: (swatch: Swatch) => void;
  onPickDebris: (swatch: Swatch) => void;
};

export default function LookPanel({
  panelOpen,
  togglePanel,
  finish,
  bgColorName,
  heroColorName,
  debrisColorName,
  bgHex,
  onPickFinish,
  onPickBg,
  onPickHero,
  onPickDebris,
}: LookPanelProps) {
  return (
    <>
      <button
        type="button"
        className="lookbtn"
        aria-expanded={panelOpen}
        aria-controls="lookpanel"
        onClick={(e) => {
          e.stopPropagation();
          togglePanel();
        }}
      >
        <span
          className="lookdot"
          style={{ "--dot-color": bgHex } as React.CSSProperties}
        />
        <span>{finish} · {bgColorName}</span>
        <span className="caret">▾</span>
      </button>

      <div id="lookpanel" className={`lookpanel${panelOpen ? " open" : ""}`}>
        <SwatchRow label="finish">
          <div className="lp-chips">
            {FINISHES.map((f) => (
              <button
                key={f.id}
                type="button"
                className="mb"
                aria-pressed={finish === f.id}
                onClick={() => onPickFinish(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </SwatchRow>

        <SwatchGrid label="bg" activeName={bgColorName} onPick={onPickBg} />
        <SwatchGrid label="hero" activeName={heroColorName} onPick={onPickHero} />
        <SwatchGrid label="debris" activeName={debrisColorName} onPick={onPickDebris} />
      </div>
    </>
  );
}

/** A labelled row inside the look panel. The children fill the right side. */
function SwatchRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lp-row">
      <span className="lp-lbl">{label}</span>
      {children}
    </div>
  );
}

/** A row of the 12 colour swatches plus its label. */
function SwatchGrid({
  label,
  activeName,
  onPick,
}: {
  label: string;
  activeName: string;
  onPick: (swatch: Swatch) => void;
}) {
  return (
    <SwatchRow label={label}>
      <div className="lp-sw">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.name}
            type="button"
            className="sw"
            title={swatch.name}
            aria-pressed={activeName === swatch.name}
            // Data-driven CSS custom property — the actual `background` and `color`
            // rules consume it via `var(--sw)` in globals.css. This is the one
            // accepted form of inline `style={{}}` (it sets a custom property,
            // not a paint property).
            style={{ "--sw": swatch.hex } as React.CSSProperties}
            onClick={() => onPick(swatch)}
          />
        ))}
      </div>
    </SwatchRow>
  );
}
