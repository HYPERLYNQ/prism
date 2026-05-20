"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROJECTS, getProjectAccent } from "@/lib/projects";
import { OWNER_EMAIL, OWNER_GITHUB } from "@/lib/siteConfig";

/**
 * Mobile-only nav rendered on every page (home, /work, /work/[slug]). Two states:
 *
 *   • Collapsed — a slim, edge-to-edge bar at the bottom of the viewport
 *     showing the "MIKE" mark and an "INDEX · N" trigger. Tap anywhere on
 *     the bar opens the sheet.
 *   • Expanded — a full-height bottom sheet that slides up over a dim
 *     backdrop. Inside: an editorial numbered list of every project
 *     (number, name, tagline, year) with a left accent bar in each project's
 *     own colour, then a foot row with github / email / location.
 *
 * Why a separate component (not just a media-query rewrite of `.strip`):
 * the sheet needs real React state (open / closed), scroll-lock side
 * effects, and an Escape-to-close handler — none of which fit neatly
 * onto the desktop strip's purely declarative markup.
 *
 * The desktop `.strip` is hidden at ≤820px (via CSS) and this component
 * takes over. Above 820px, this component is `display: none`.
 *
 * Optional `activeSlug` highlights the matching row in the sheet with
 * `aria-current="page"` and the `.is-active` class.
 *
 * Styles live in `globals.css` under the `.mob-*` prefix.
 */

type MobileIndexSheetProps = {
  activeSlug?: string;
};

export default function MobileIndexSheet({ activeSlug }: MobileIndexSheetProps = {}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the sheet is up — otherwise the page can
  // scroll behind the panel on iOS Safari when the user pans within it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes the sheet (matches the dialog convention).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close(): void {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="mob-bar"
        aria-expanded={open}
        aria-controls="mob-sheet"
        onClick={() => setOpen(true)}
      >
        <span className="mob-bar-brand">MIKE</span>
        <span className="mob-bar-divider" aria-hidden="true">/</span>
        <span className="mob-bar-label">INDEX</span>
        <span className="mob-bar-count">{String(PROJECTS.length).padStart(2, "0")}</span>
        <span className="mob-bar-spacer" aria-hidden="true" />
        <span className="mob-bar-arrow" aria-hidden="true">↑</span>
      </button>

      <div
        id="mob-sheet"
        className={`mob-sheet${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Project index"
      >
        {/* Backdrop — a button so the click-to-close affordance is exposed to assistive tech. */}
        <button
          type="button"
          className="mob-sheet-backdrop"
          tabIndex={-1}
          aria-label="Close index"
          onClick={close}
        />

        <div className="mob-sheet-panel">
          {/* Grabber at the top — visual hint that the sheet is dismissable. */}
          <span className="mob-sheet-grabber" aria-hidden="true" />

          <div className="mob-sheet-header">
            <span className="mob-sheet-eyebrow">Index</span>
            <span className="mob-sheet-eyebrow-count">{String(PROJECTS.length).padStart(2, "0")} projects</span>
            <button
              type="button"
              className="mob-sheet-close"
              aria-label="Close"
              onClick={close}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <ol className="mob-sheet-list">
            {PROJECTS.map((project, i) => {
              const accent = getProjectAccent(project.slug);
              const isActive = project.slug === activeSlug;
              return (
                <li
                  key={project.slug}
                  className={`mob-sheet-item${isActive ? " is-active" : ""}`}
                  // Data-driven left-bar accent — consumed by `background: var(--accent)` in CSS.
                  style={{ "--accent": accent.hex } as React.CSSProperties}
                >
                  <Link
                    href={`/work/${project.slug}`}
                    className="mob-sheet-link"
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="mob-sheet-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="mob-sheet-body">
                      <span className="mob-sheet-name">{project.name}</span>
                      <span className="mob-sheet-tag">{project.tagline}</span>
                    </span>
                    <span className="mob-sheet-year">{project.year}</span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="mob-sheet-foot">
            <div className="mob-sheet-foot-links">
              <a href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer">github ↗</a>
              <span className="mob-sheet-foot-sep" aria-hidden="true">·</span>
              <a href={`mailto:${OWNER_EMAIL}`}>email ↗</a>
            </div>
            <div className="mob-sheet-foot-loc">Miami · remote-first</div>
          </div>
        </div>
      </div>
    </>
  );
}
