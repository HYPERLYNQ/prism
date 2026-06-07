"use client";

import { useEffect, useRef, useState } from "react";
import { FINISHES, SWATCHES, type MatName, type Swatch } from "@/lib/looks";

/**
 * Floating "Look" console — replaces the previous top-left look button +
 * dropdown panel (which lived in `LookPanel.tsx`). Pill anchored at
 * bottom-center of the viewport; the four current selections show inline
 * as small swatch dots. Clicking opens the picker panel above the pill.
 *
 * Owns its own open/close state. Picker selections themselves live in the
 * `Hero` parent and are pushed to the WebGL scene via the imperative apiRef;
 * this component just renders the controls and fires callbacks.
 *
 * The inner panel content (finish chips + 3 swatch grids) reuses the same
 * `.lp-row` / `.lp-chips` / `.lp-sw` / `.sw` / `.mb` class names the old
 * picker used, so the swatch styling carries over without rework.
 */

type LookConsoleProps = {
  finish: MatName;
  bgColorName: string;
  heroColorName: string;
  debrisColorName: string;
  /** Hex of the active bg swatch — drives the inline preview dot. */
  bgHex: string;
  /** Hex of the active hero tint. */
  heroHex: string;
  /** Hex of the active debris tint. */
  debrisHex: string;
  onPickFinish: (id: MatName) => void;
  onPickBg: (swatch: Swatch) => void;
  onPickHero: (swatch: Swatch) => void;
  onPickDebris: (swatch: Swatch) => void;
};

export default function LookConsole(props: LookConsoleProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; dy: number } | null>(null);

  // Outside-click + Escape close. The panel button stops propagation on its
  // own click so toggling doesn't immediately re-close.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Swipe-down-to-close — only on mobile (≤600px) where the panel renders
  // as a bottom sheet. The swipe initiates only when the panel is scrolled
  // to the very top, so normal scroll inside the panel still works for
  // longer content (swipe up = scroll content, swipe down at top = close).
  function onTouchStart(e: React.TouchEvent) {
    if (!open) return;
    if (typeof window === "undefined" || window.innerWidth > 600) return;
    const panel = panelRef.current;
    if (!panel || panel.scrollTop > 0) return;
    dragRef.current = { startY: e.touches[0].clientY, dy: 0 };
    panel.style.transition = "none";
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragRef.current || !panelRef.current) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dy < 0) return; // ignore upward swipes — those are scrolls
    dragRef.current.dy = dy;
    panelRef.current.style.transform = `translateY(${dy}px)`;
  }
  function onTouchEnd() {
    const drag = dragRef.current;
    const panel = panelRef.current;
    dragRef.current = null;
    if (!drag || !panel) return;
    // Restore the CSS-controlled transition for the spring/dismiss animation.
    panel.style.transition = "transform 0.26s cubic-bezier(0.2, 0.7, 0.2, 1)";
    if (drag.dy > 80) {
      // Past the close threshold — animate to fully off-screen, then commit
      // the React close so the panel doesn't snap back into view first.
      panel.style.transform = "translateY(100%)";
      window.setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = "";
          panelRef.current.style.transform = "";
        }
        setOpen(false);
      }, 260);
    } else {
      // Under the threshold — spring back to the open position.
      panel.style.transform = "translateY(0)";
      window.setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = "";
          panelRef.current.style.transform = "";
        }
      }, 260);
    }
  }

  return (
    <div
      ref={rootRef}
      className={`look-console${open ? " is-open" : ""}`}
    >
      {/* Picker panel rises ABOVE the console button when open. The inner
          rows reuse the .lp-* class names from the original LookPanel so
          the swatch chips/grids inherit their styling.

          Disclosure semantics, not dialog: the toggle button already has
          aria-expanded + aria-controls pointing here, which is the
          correct disclosure pattern. The previous role="dialog" set the
          wrong AT expectation (focus trap, focus return, inert siblings)
          which wasn't implemented. `inert` removes the panel from the AT
          tree + focus order when closed. */}
      <div
        ref={panelRef}
        className="look-console-panel"
        id="look-console-panel"
        aria-label="Look picker"
        inert={!open}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle — visual hint for the swipe-down-to-close gesture.
            Only rendered visible on the mobile bottom-sheet tier via CSS. */}
        <div className="look-console-handle" aria-hidden="true" />
        <SwatchRow label="finish">
          <div className="lp-chips">
            {FINISHES.map((f) => (
              <button
                key={f.id}
                type="button"
                className="mb"
                aria-pressed={props.finish === f.id}
                onClick={() => props.onPickFinish(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </SwatchRow>
        <SwatchGrid label="bg" activeName={props.bgColorName} onPick={props.onPickBg} />
        <SwatchGrid label="hero" activeName={props.heroColorName} onPick={props.onPickHero} />
        <SwatchGrid label="debris" activeName={props.debrisColorName} onPick={props.onPickDebris} />
      </div>

      {/* Console button — always visible, inline swatch dots show current
          selections at a glance. */}
      <button
        type="button"
        className="look-console-btn"
        aria-expanded={open}
        aria-controls="look-console-panel"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="look-console-label">Look</span>
        <span className="look-console-swatches" aria-hidden="true">
          <span
            className="look-console-sw look-console-sw-finish"
            data-finish={props.finish}
          />
          <span
            className="look-console-sw"
            style={{ background: props.bgHex }}
          />
          <span
            className="look-console-sw"
            style={{ background: props.heroHex }}
          />
          <span
            className="look-console-sw"
            style={{ background: props.debrisHex }}
          />
        </span>
        <span className="look-console-values">
          {props.finish}
          <span className="sep" aria-hidden="true">·</span>
          {props.bgColorName}
        </span>
        <span className="look-console-caret" aria-hidden="true">{open ? "▾" : "▴"}</span>
      </button>
    </div>
  );
}

function SwatchRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lp-row">
      <span className="lp-lbl">{label}</span>
      {children}
    </div>
  );
}

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
            style={{ "--sw": swatch.hex } as React.CSSProperties}
            onClick={() => onPick(swatch)}
          />
        ))}
      </div>
    </SwatchRow>
  );
}
