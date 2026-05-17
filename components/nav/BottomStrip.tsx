import { Fragment } from "react";
import Link from "next/link";
import { PROJECTS } from "@/lib/projects";
import { OWNER_EMAIL, OWNER_GITHUB } from "@/lib/siteConfig";

/**
 * The persistent bottom nav rendered at desktop widths (>820px) on every page.
 *
 * Layout, left to right:
 *   • `WORK` label.
 *   • Inline-separated list of every project. Optionally one entry is marked
 *     "active" — used on `/work/[slug]` pages to show which case study you're
 *     reading. Home + `/work` index pass no active slug.
 *   • Misc utility links (github, email) and the location.
 *
 * Mobile (≤820px) hides this strip and falls back to `MobileIndexSheet`.
 *
 * Server component — pure markup, no client state. The mobile counterpart
 * (`MobileIndexSheet`) is a client component because its open / close state
 * lives in React.
 */

type BottomStripProps = {
  /** Slug of the active project, if any. The matching link picks up the
   *  `is-active` modifier (bolded + underlined). */
  activeSlug?: string;
};

export default function BottomStrip({ activeSlug }: BottomStripProps) {
  return (
    <div className="strip">
      <div className="strip-l">
        <span className="strip-label">Work</span>
        <nav className="work-links" aria-label="Projects">
          {PROJECTS.map((project, i) => {
            const isActive = project.slug === activeSlug;
            return (
              <Fragment key={project.slug}>
                {i > 0 && <span className="sep">·</span>}
                <Link
                  href={`/work/${project.slug}`}
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? "is-active" : undefined}
                >
                  {project.name}
                </Link>
              </Fragment>
            );
          })}
        </nav>
      </div>
      <div className="strip-r">
        <a href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer">github ↗</a>
        <a href={`mailto:${OWNER_EMAIL}`}>email ↗</a>
        <span className="sep">·</span>
        <span className="loc">Miami · remote-first</span>
      </div>
    </div>
  );
}
