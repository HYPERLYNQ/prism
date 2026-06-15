"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PROJECTS } from "@/lib/projects";

/**
 * Work tab in the desktop masthead. Unlike Contact (click-to-toggle), this is a
 * hover/focus-revealed dropdown so visitors can jump straight to a project
 * without first loading the /work index. "Work" itself stays a real link to
 * /work — clicking navigates to the index, hovering reveals the project list.
 *
 * Behaviour:
 *   - Opens on pointer hover and on keyboard focus entering the group.
 *   - Closes on pointer leave (after a short grace so the cursor can travel
 *     the gap into the panel), on focus leaving the group, and on Escape.
 *
 * Desktop-only by placement: the masthead tabs are hidden at ≤820px, where the
 * hamburger sheet (MastheadMobile) owns the same project list as an accordion.
 *
 * Client component for the open state + hover-intent timer; the rest of the
 * Masthead stays server-rendered.
 */

type Props = {
  active?: boolean;
  activeProject?: string;
  /** Zero-padded project count, e.g. "06" — computed server-side by Masthead. */
  count: string;
};

export default function MastheadWork({ active, activeProject, count }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Grace timer so moving the cursor across the trigger→panel gap doesn't drop
  // the menu (the panel is out of flow, so that gap briefly leaves the root box).
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }
  useEffect(() => () => cancelClose(), []);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`masthead-work${open ? " is-open" : ""}${active ? " is-active" : ""}`}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      // Keyboard: opening on focus-in makes the list reachable by Tab; closing
      // on focus-out (to an element outside the group) hides it again.
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Link
        href="/work"
        className={`masthead-tab${active ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls="masthead-work-menu"
      >
        <span className="masthead-tab-label">Work</span>
        <span className="masthead-tab-meta">{count}</span>
        {activeProject && (
          <span className="masthead-tab-suffix">/ {activeProject}</span>
        )}
      </Link>

      {open && (
        <div id="masthead-work-menu" className="masthead-work-menu">
          {PROJECTS.map((project, i) => {
            const isActive = project.slug === activeProject;
            return (
              <Link
                key={project.slug}
                href={`/work/${project.slug}`}
                className={`masthead-work-item${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="masthead-work-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="masthead-work-name">{project.name}</span>
                <span className="masthead-work-year">{project.year}</span>
              </Link>
            );
          })}
          <Link href="/work" className="masthead-work-all">
            <span className="masthead-work-all-label">View all work</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
