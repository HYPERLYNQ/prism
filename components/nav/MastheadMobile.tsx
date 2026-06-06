"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROJECTS } from "@/lib/projects";
import { OWNER_EMAIL, OWNER_GITHUB, OWNER_LOCATION } from "@/lib/siteConfig";
import type { MastheadTab } from "./Masthead";

/**
 * Mobile-only hamburger menu in the masthead. At >820px the desktop tabs
 * show; at ≤820px those are hidden and this hamburger takes over.
 *
 * When opened, the sheet shows:
 *   - Primary navigation (Work / Writing / Resume — Contact lives at the
 *     bottom alongside the actual links since on mobile there's no benefit
 *     to a nested dropdown)
 *   - The full project index (numbered list with active highlight)
 *   - Contact links (GitHub / Email / Location)
 *
 * Replaces the previous MobileIndexSheet pattern.
 */

type Props = {
  activeTab?: MastheadTab;
  activeProject?: string;
};

export default function MastheadMobile({ activeTab, activeProject }: Props) {
  const [open, setOpen] = useState(false);
  // Work section is collapsed by default. If the visitor is currently ON a
  // project page, default-expand so the active project is immediately visible.
  const [workOpen, setWorkOpen] = useState(Boolean(activeProject));

  // Lock body scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes.
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
        className="masthead-burger"
        aria-expanded={open}
        aria-controls="masthead-sheet"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true" className="masthead-burger-glyph">≡</span>
      </button>

      {/* Disclosure region, not a dialog. The previous role="dialog"
          aria-modal="true" pair set the expectation of a full dialog
          contract (focus trap, focus return, inert siblings, reachable
          close button) which wasn't implemented. The burger already has
          aria-expanded + aria-controls — that's the disclosure pattern
          and it's what this UI actually is. `inert` is supported in
          every modern browser (Safari 15.5+, Chrome 102+, Firefox 112+)
          and removes the panel from the AT tree + focus order when
          closed, which is the correct semantics for a hidden disclosure. */}
      <div
        id="masthead-sheet"
        className={`masthead-sheet${open ? " is-open" : ""}`}
        aria-label="Menu"
        inert={!open}
      >
        <button
          type="button"
          className="masthead-sheet-backdrop"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={close}
        />
        <div className="masthead-sheet-panel">
          <div className="masthead-sheet-head">
            <span className="masthead-sheet-eyebrow">Menu</span>
            <button
              type="button"
              className="masthead-sheet-close"
              aria-label="Close"
              onClick={close}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {/* Primary nav — three equal-weight destinations. Work is a
              collapsible accordion: tap the row to expand / collapse the
              project list inline. The chevron (▾ / ▴) signals state. Default-
              expanded when the visitor is currently on a project page. */}
          <nav className="masthead-sheet-nav" aria-label="Primary">
            <button
              type="button"
              className={`masthead-sheet-link masthead-sheet-link-work${activeTab === "work" ? " is-active" : ""}${workOpen ? " is-open" : ""}`}
              aria-expanded={workOpen}
              aria-controls="masthead-sheet-projects"
              onClick={() => setWorkOpen((v) => !v)}
            >
              <span>Work</span>
              <span className="masthead-sheet-meta">
                {String(PROJECTS.length).padStart(2, "0")}
                <span className="masthead-sheet-chev" aria-hidden="true">▾</span>
              </span>
            </button>

            {/* Project list — always in the DOM so the grid-template-rows
                transition can interpolate height smoothly between 0fr / 1fr.
                `aria-hidden` mirrors the visual state for assistive tech. */}
            <div
              id="masthead-sheet-projects"
              className={`masthead-sheet-projects-wrap${workOpen ? " is-open" : ""}`}
              aria-hidden={!workOpen}
            >
              <div className="masthead-sheet-projects-inner">
                <ol className="masthead-sheet-projects">
                  {PROJECTS.map((project, i) => {
                    const isActive = project.slug === activeProject;
                    return (
                      <li
                        key={project.slug}
                        className={`masthead-sheet-project-item${isActive ? " is-active" : ""}`}
                      >
                        <Link
                          href={`/work/${project.slug}`}
                          onClick={close}
                          className="masthead-sheet-project"
                          aria-current={isActive ? "page" : undefined}
                          tabIndex={workOpen ? 0 : -1}
                        >
                          <span className="masthead-sheet-num">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="masthead-sheet-name">{project.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                  <li>
                    <Link
                      href="/work"
                      onClick={close}
                      className={`masthead-sheet-viewall${activeTab === "work" && !activeProject ? " is-active" : ""}`}
                      tabIndex={workOpen ? 0 : -1}
                    >
                      View all work <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                </ol>
              </div>
            </div>

            <Link
              href="/blog"
              onClick={close}
              className={`masthead-sheet-link${activeTab === "writing" ? " is-active" : ""}`}
            >
              <span>Writing</span>
              <span className="masthead-sheet-meta">/blog</span>
            </Link>
            <Link
              href="/resume"
              onClick={close}
              className={`masthead-sheet-link${activeTab === "resume" ? " is-active" : ""}`}
            >
              <span>Resume</span>
              <span className="masthead-sheet-meta">/resume</span>
            </Link>
          </nav>

          <section className="masthead-sheet-section">
            <span className="masthead-sheet-eyebrow">Contact</span>
            <div className="masthead-sheet-contact">
              <a href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer">
                github ↗
              </a>
              <span className="masthead-sheet-sep" aria-hidden="true">·</span>
              <a
                href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent("Re: mikevidal.dev — let's talk")}`}
              >
                email →
              </a>
              <span className="masthead-sheet-loc">{OWNER_LOCATION}</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
