import ProjectBlobBanner from "./ProjectBlobBanner";
import type { Project } from "@/lib/projects";
import type { Swatch } from "@/lib/looks";

/**
 * The big coloured banner at the top of every `/work/[slug]` page.
 *
 * Layout:
 *   • An iridescent WebGL metaball blob (`ProjectBlobBanner`) drifts in the
 *     banner, tinted per project.
 *   • Title block sits on top: eyebrow (year · role), big project name,
 *     tagline. Centred vertically with generous padding.
 *
 * `ProjectHeroBanner` itself is a pure Server Component (just markup); the
 * blob is the only client boundary, isolated in `ProjectBlobBanner`.
 */

type ProjectHeroBannerProps = {
  project: Project;
  accent: Swatch;
};

export default function ProjectHeroBanner({ project, accent }: ProjectHeroBannerProps) {
  return (
    <section
      className={`project-hero-banner${accent.dark ? " is-dark" : ""}`}
      style={{
        "--banner-accent": accent.hex,
        "--banner-accent-deep": accent.deep,
      } as React.CSSProperties}
    >
      <ProjectBlobBanner accent={accent} />

      <div className="project-hero-banner-inner">
        <div className="project-hero-banner-text">
          <div className="project-hero-banner-eyebrow">
            <span>{project.year}</span>
            <span className="project-hero-banner-sep">·</span>
            <span>{project.role}</span>
          </div>
          {/* Split each character into a `<span class="char">` wrapped in a
              `<span class="char-mask">` clip box. GSAP slides each `.char` up
              from below the mask line for a cinematic letter-by-letter reveal.
              Non-break-space substituted for actual spaces so flex/inline
              layout doesn't collapse them. */}
          <h1 className="project-hero-banner-title" aria-label={project.name}>
            {project.name.split("").map((char, i) => (
              <span key={i} className="char-mask" aria-hidden="true">
                <span className="char">{char === " " ? " " : char}</span>
              </span>
            ))}
          </h1>
          <p className="project-hero-banner-tagline">{project.tagline}</p>
        </div>
      </div>
    </section>
  );
}
