"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROJECTS, getProjectAccent } from "@/lib/projects";
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

      <div
        id="masthead-sheet"
        className={`masthead-sheet${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
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

          {/* Primary nav — Writing + Resume only. Work is NOT a separate top-
              level link because that would duplicate the projects section
              below; the Work section IS the projects (with a 'View all work →'
              link at its end for visitors who want the /work index page). */}
          <nav className="masthead-sheet-nav" aria-label="Primary">
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
            <span
              className={`masthead-sheet-eyebrow${activeTab === "work" ? " is-active" : ""}`}
            >
              Work · {String(PROJECTS.length).padStart(2, "0")}
            </span>
            <ol className="masthead-sheet-projects">
              {PROJECTS.map((project, i) => {
                const accent = getProjectAccent(project.slug);
                const isActive = project.slug === activeProject;
                return (
                  <li
                    key={project.slug}
                    className={`masthead-sheet-project-item${isActive ? " is-active" : ""}`}
                    style={{ "--accent": accent.hex } as React.CSSProperties}
                  >
                    <Link
                      href={`/work/${project.slug}`}
                      onClick={close}
                      className="masthead-sheet-project"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="masthead-sheet-num">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="masthead-sheet-name">{project.name}</span>
                      <span className="masthead-sheet-tag">{project.tagline}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {/* Closing entry — explicit link to the /work index for visitors
                who want the full list page rather than jumping to a project. */}
            <Link
              href="/work"
              onClick={close}
              className={`masthead-sheet-viewall${activeTab === "work" && !activeProject ? " is-active" : ""}`}
            >
              View all work <span aria-hidden="true">→</span>
            </Link>
          </section>

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
