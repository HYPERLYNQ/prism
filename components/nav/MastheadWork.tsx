"use client";

import Link from "next/link";
import { PROJECTS } from "@/lib/projects";
import { useHoverMenu } from "./useHoverMenu";

/**
 * Work tab in the desktop masthead. A hover/focus-revealed dropdown (shared
 * behaviour with Contact via useHoverMenu) so visitors can jump straight to a
 * project without first loading the /work index. "Work" itself stays a real
 * link to /work — clicking navigates to the index, hovering reveals the list.
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
  const { open, rootProps } = useHoverMenu();

  return (
    <div
      className={`masthead-work${open ? " is-open" : ""}${active ? " is-active" : ""}`}
      {...rootProps}
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
