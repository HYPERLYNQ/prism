import Link from "next/link";
import { PROJECTS } from "@/lib/projects";
import { OWNER_NAME, OWNER_ROLE } from "@/lib/siteConfig";
import MastheadContact from "./MastheadContact";
import MastheadMobile from "./MastheadMobile";
import MastheadScrollSentry from "./MastheadScrollSentry";
import MastheadWork from "./MastheadWork";

/**
 * The site-wide top masthead. Replaces the previous corner-overlay system
 * (top-left masthead + top-right status + bottom strip + project topbar)
 * with a single fixed top bar.
 *
 * Layout (desktop):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Michael Vidal · Applied AI Engineer · ● open to AI / FDE roles
 *   │                                  Work · Writing · Resume · Contact
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Tabs:
 *   - Work    → /work (project index; on /work/[slug] the active project
 *                       name appears alongside the tab)
 *   - Writing → /blog
 *   - Resume  → /resume
 *   - Contact → opens a small dropdown (GitHub / Email / Location)
 *
 * Mobile (≤820px): tabs collapse to a hamburger menu — see MastheadMobile.
 *
 * Server component — the route-aware active tab is passed explicitly from
 * the calling page so the bar can render at build time on static routes.
 */

export type MastheadTab = "work" | "writing" | "resume" | "contact";

type MastheadProps = {
  /** Drives the 2px underline on the active tab. Omit on the home page,
   *  404, and any route that shouldn't highlight a tab. */
  activeTab?: MastheadTab;
  /** When on `/work/[slug]`, the project name appears after the Work tab. */
  activeProject?: string;
};

export default function Masthead({ activeTab, activeProject }: MastheadProps) {
  const projectCount = String(PROJECTS.length).padStart(2, "0");

  return (
    <header className="masthead">
      <MastheadScrollSentry />
      <div className="masthead-l">
        <Link href="/" className="masthead-name" aria-label={`${OWNER_NAME} — home`}>
          {OWNER_NAME}
        </Link>
        <span className="masthead-role">{OWNER_ROLE}</span>
        <span className="masthead-status">
          <span className="masthead-status-dot" aria-hidden="true" />
          open to AI / FDE roles
        </span>
      </div>

      <nav className="masthead-tabs" aria-label="Primary">
        <MastheadWork
          active={activeTab === "work"}
          activeProject={activeProject}
          count={projectCount}
        />
        <Link
          href="/blog"
          className={`masthead-tab${activeTab === "writing" ? " is-active" : ""}`}
        >
          <span className="masthead-tab-label">Writing</span>
          <span className="masthead-tab-meta">/blog</span>
        </Link>
        <Link
          href="/resume"
          className={`masthead-tab${activeTab === "resume" ? " is-active" : ""}`}
        >
          <span className="masthead-tab-label">Resume</span>
          <span className="masthead-tab-meta">/resume</span>
        </Link>
        <MastheadContact active={activeTab === "contact"} />
      </nav>

      {/* Mobile-only hamburger; the tabs above are hidden at ≤820px. */}
      <MastheadMobile activeTab={activeTab} activeProject={activeProject} />
    </header>
  );
}
