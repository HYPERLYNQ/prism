import Link from "next/link";
import { PROJECTS } from "@/lib/projects";

/**
 * The big prev / next pager at the bottom of a project page. Wraps around the
 * project list so every page has both sides — there's never a dead-end "no next."
 *
 * Each side shows a small "PREV PROJECT" / "NEXT PROJECT" label in mono caps,
 * then the project name in Space Grotesk display weight (much larger than the
 * old text-link version).
 */

type ProjectPrevNextProps = {
  /** The slug of the current page, used to compute the wraparound prev/next. */
  currentSlug: string;
};

export default function ProjectPrevNext({ currentSlug }: ProjectPrevNextProps) {
  const index = PROJECTS.findIndex((project) => project.slug === currentSlug);
  // Defensive: if the slug isn't in PROJECTS at all, fall back to the first item.
  const safeIndex = index < 0 ? 0 : index;
  const prev = PROJECTS[(safeIndex - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(safeIndex + 1) % PROJECTS.length];

  return (
    <nav className="project-pager" aria-label="Project pagination">
      <Link href={`/work/${prev.slug}`} className="project-pager-link is-prev">
        <span className="project-pager-label">← Prev project</span>
        <span className="project-pager-name">{prev.name}</span>
      </Link>
      <Link href={`/work/${next.slug}`} className="project-pager-link is-next">
        <span className="project-pager-label">Next project →</span>
        <span className="project-pager-name">{next.name}</span>
      </Link>
    </nav>
  );
}
