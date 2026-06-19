import type { Metadata } from "next";
import Link from "next/link";
import { PROJECTS } from "@/lib/projects";
import {
  OWNER_NAME,
  OWNER_ROLE,
  OWNER_LOCATION,
  OWNER_EMAIL,
  OWNER_GITHUB,
  SITE_URL,
} from "@/lib/siteConfig";
import Masthead from "@/components/nav/Masthead";
import ResumePrintButton from "./ResumePrintButton";

/**
 * `/resume` — auto-generated from `lib/projects.ts` so it never drifts from
 * the case studies. Recruiters can read it on the web or hit ⌘P to save as
 * a PDF (the @media print stylesheet on `.resume` strips the chrome and lays
 * the content out for letter / A4).
 *
 * Why a page and not a static PDF: a single source of truth (no twin docs to
 * keep in sync), ATS-scrapers prefer real HTML to PDF text extraction, and
 * any update to `lib/projects.ts` shows up on the resume next deploy.
 */

export const metadata: Metadata = {
  title: "Resume",
  description: `Resume for ${OWNER_NAME} — ${OWNER_ROLE}. ${PROJECTS.length} solo projects shipped or in active build.`,
  alternates: { canonical: "/resume" },
};

export default function ResumePage() {
  // Aggregate technologies across projects into a tighter "skills" line. Use a
  // curated subset (the recurring + load-bearing names) rather than dumping
  // every stack entry — the latter reads as keyword soup.
  const skills = [
    "TypeScript",
    "Python",
    "Rust",
    "Node 22+",
    "React 19",
    "Next.js 16",
    "Tauri 2",
    "Three.js",
    "Tailwind v4",
    "Claude API (tool-use, structured output, prompt caching)",
    "MCP",
    "sqlite-vec",
    "Transformers.js (local embeddings)",
    "XGBoost",
    "LightGBM",
    "scikit-learn",
    "Prisma 7",
    "PostgreSQL",
    "SQLite",
    "Redis",
    "Celery",
    "Shopify App Bridge",
    "Shopify Functions",
    "Smartlead",
    "Stripe",
  ];

  // Host without protocol for printed/visible URLs (the underlying anchors
  // still use full URLs). Cheaper on the eye than printing `https://`.
  const cleanHost = (url: string) => url.replace(/^https?:\/\//, "");

  return (
    <>
      {/* Masthead is hidden in print via @media print { .masthead { display: none } }
          (see globals.css) so the saved PDF starts at the resume name. */}
      <Masthead activeTab="resume" />
      <main className="resume">
        <header className="resume-header">
        <div className="resume-header-l">
          <h1 className="resume-name">{OWNER_NAME}</h1>
          <p className="resume-role">
            {OWNER_ROLE} · {OWNER_LOCATION}
          </p>
        </div>
        <div className="resume-header-r">
          <a href={`mailto:${OWNER_EMAIL}?subject=Re%3A%20${encodeURIComponent(`${OWNER_NAME} — portfolio`)}`}>
            {OWNER_EMAIL}
          </a>
          <span className="resume-dot" aria-hidden="true">·</span>
          <a href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer">
            {cleanHost(OWNER_GITHUB)}
          </a>
          <span className="resume-dot" aria-hidden="true">·</span>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
            {cleanHost(SITE_URL)}
          </a>
        </div>
      </header>

      <ResumePrintButton />

      <section className="resume-section">
        <p className="resume-summary">
          Applied-AI engineer. Ship LLM-powered systems to production end-to-end:
          multi-stage pipelines, tool-use, structured output, and human-in-the-loop
          workflows. Solo, production-grade. Open to AI Engineer{" / "}FDE
          roles.
        </p>
      </section>

      <section className="resume-section">
        <h2 className="resume-h2">Selected work</h2>
        <ul className="resume-projects">
          {PROJECTS.map((project) => {
            // The role is "Solo — founder, engineer, shipped to App Store"; the
            // lead ("Solo") is the load-bearing part. Split off the detail so the
            // mobile meta line can hide it (it's what wraps), keeping the full
            // role on desktop / the PDF.
            const dash = project.role.indexOf("—");
            const roleLead = dash === -1 ? project.role : project.role.slice(0, dash).trim();
            const roleDetail = dash === -1 ? "" : project.role.slice(dash + 1).trim();
            return (
            <li key={project.slug} className="resume-project">
              <div className="resume-project-head">
                <h3 className="resume-project-name">
                  <a href={`${SITE_URL}/work/${project.slug}`}>{project.name}</a>
                </h3>
                <span className="resume-project-meta">
                  {project.year} · {roleLead}
                  {roleDetail && (
                    <span className="resume-project-role-detail"> — {roleDetail}</span>
                  )}
                </span>
              </div>

              {project.status && (
                <p className="resume-project-status">
                  {project.status}
                  {/* "Open source" is already implied by an open-source status
                      string + the repo link, so only the private flag adds
                      signal (it explains the absent repo). Drops the
                      "Open source · v1.7.6 · Open source" duplication. */}
                  {project.visibility === "private" && (
                    <span className="resume-project-vis"> · Private</span>
                  )}
                </p>
              )}

              {project.lede && <p className="resume-project-lede">{project.lede}</p>}

              <p className="resume-project-tag">{project.tagline}</p>

              <ul className="resume-project-bullets">
                {project.highlights.slice(0, 4).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>

              <p className="resume-project-stack">
                <span className="resume-project-stack-label">Stack:</span>{" "}
                {project.stack.join(" · ")}
              </p>
            </li>
            );
          })}
        </ul>
      </section>

      <section className="resume-section">
        <h2 className="resume-h2">Stack &amp; tooling</h2>
        <p className="resume-skills">{skills.join(" · ")}</p>
      </section>

      <section className="resume-section">
        <h2 className="resume-h2">Education</h2>
        <ul className="resume-education">
          {/* Most relevant first: the software-engineering credential, then the
              UMiami BS, then the brief language-studies term. Inline because the
              list is short, stable, and only used here — no separate data file. */}
          <li className="resume-edu">
            <div className="resume-edu-head">
              <h3 className="resume-edu-school">
                BrainStation <span className="resume-edu-sep" aria-hidden="true">·</span>{" "}
                <span className="resume-edu-degree">Diploma, Software Engineering</span>
              </h3>
              <span className="resume-edu-meta">2023 · Miami, FL</span>
            </div>
          </li>
          <li className="resume-edu">
            <div className="resume-edu-head">
              <h3 className="resume-edu-school">
                University of Miami <span className="resume-edu-sep" aria-hidden="true">·</span>{" "}
                <span className="resume-edu-degree">Bachelor of Business Administration, Entrepreneurship</span>
              </h3>
              <span className="resume-edu-meta">2008–2012 · Miami, FL</span>
            </div>
          </li>
          <li className="resume-edu">
            <div className="resume-edu-head">
              <h3 className="resume-edu-school">
                Shanghai Jiao Tong University <span className="resume-edu-sep" aria-hidden="true">·</span>{" "}
                <span className="resume-edu-degree">Language Studies</span>
              </h3>
              <span className="resume-edu-meta">2013 · Shanghai, China</span>
            </div>
          </li>
        </ul>
      </section>

      <section className="resume-section">
        <h2 className="resume-h2">Writing</h2>
        <p className="resume-writing">
          <Link href="/blog">{cleanHost(SITE_URL)}/blog</Link> — notes on applied AI,
          LLM pipelines, and shipping real systems.
        </p>
        </section>
      </main>
    </>
  );
}
