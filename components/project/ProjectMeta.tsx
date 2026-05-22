import type { Project } from "@/lib/projects";
import type { Swatch } from "@/lib/looks";
import ProjectProofToken from "./ProjectProofToken";

/**
 * The body section of a project page — everything between the gradient
 * banner and the prev/next pager.
 *
 * Layout (modeled after udo-audio.com/super-gemini):
 *   • Asymmetric two-column for each section: a small `01  Overview` label
 *     pinned to the LEFT column, body content flowing in the RIGHT column.
 *     On narrow viewports the columns stack vertically.
 *   • Status badge and meta grid sit ABOVE the section grid, spanning the
 *     full width.
 *   • Section titles are sentence-case grotesk at the same size as the mono
 *     number — no drama, just structure.
 *   • No drop cap and no oversized numerals. The whitespace and column
 *     rhythm do the work.
 *
 * Pure presentation. The accent palette comes from the parent
 * (`getProjectAccent`) so this component can be a Server Component.
 */

type ProjectMetaProps = {
  project: Project;
  accent: Swatch;
};

export default function ProjectMeta({ project, accent }: ProjectMetaProps) {
  const accentStyle = { "--accent": accent.hex } as React.CSSProperties;
  const summaryParagraphs = project.summary.split("\n\n");

  return (
    <div className="project-body" style={accentStyle}>
      {project.proof && (
        <div className="project-proof" role="status">
          <ProjectProofToken text={project.proof} tintHex={accent.hex} />
          {project.status && (
            <span className="project-proof-caption">{project.status}</span>
          )}
        </div>
      )}

      <div className="meta">
        <MetaCell label="Year" value={project.year} />
        <MetaCell label="Role" value={project.role} />
        {project.stack.length > 0 && (
          <MetaCell label="Built with" value={project.stack.slice(0, 4).join(" · ")} />
        )}
      </div>

      <Section number="01" title="Overview">
        <div className="body body-editorial">
          {summaryParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </Section>

      {project.highlights.length > 0 && (
        <Section number="02" title="Highlights">
          <ol className="project-highlights">
            {project.highlights.map((highlight, i) => (
              <li key={i}>
                <span className="project-highlights-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="project-highlights-text">{highlight}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {project.stack.length > 0 && (
        <Section number="03" title="Stack">
          <div className="stack stack-accent">
            {project.stack.map((technology, i) => (
              <span key={i}>{technology}</span>
            ))}
          </div>
        </Section>
      )}

      {project.link && (
        <Section number="04" title="Visit">
          <a
            href={project.link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="project-cta"
          >
            <span className="project-cta-label">{project.link.label}</span>
            <span className="project-cta-host">{hostFromHref(project.link.href)}</span>
            <span className="project-cta-arrow" aria-hidden="true">↗</span>
          </a>
        </Section>
      )}
    </div>
  );
}

/** Single key/value cell inside the meta-grid card. */
function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="meta-key">{label}</div>
      <div className="meta-val">{value}</div>
    </div>
  );
}

/**
 * A section is a two-column grid: header label on the left, content on the right.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  01   Overview     │  Body text content flows here…         │
 *   │                    │                                        │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * On narrow viewports (<800px) the columns stack vertically so the label
 * sits above the body. CSS lives under `.project-section` in globals.css.
 */
function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="project-section">
      <header className="project-section-header">
        <span className="project-section-num" aria-hidden="true">{number}</span>
        <h2 className="project-section-title">{title}</h2>
      </header>
      <div className="project-section-body">{children}</div>
    </section>
  );
}

/** Extract a host for the CTA's secondary label (e.g. `github.com`). Falls
 *  back to the raw href if parsing fails (relative URLs, etc.). */
function hostFromHref(href: string): string {
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return href;
  }
}
