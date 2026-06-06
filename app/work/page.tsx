import type { Metadata } from "next";
import Link from "next/link";
import { PROJECTS, getProjectAccent } from "@/lib/projects";
import PageEnter from "@/components/project/PageEnter";
import Masthead from "@/components/nav/Masthead";

/**
 * Work index at `/work` — a list of every project linking to its case-study page.
 *
 * The top Masthead (Work tab active) is the nav across the whole site since the
 * tabbed-masthead refactor; the old ProjectTopbar / BottomStrip / MobileIndexSheet
 * trio is gone.
 */

export const metadata: Metadata = {
  title: "Work",
  description: "Applied AI systems — built solo, shipped to production.",
};

export default function WorkIndex() {
  return (
    <main id="main" className="project-page">
      <Masthead activeTab="work" />

      <PageEnter>
        <div className="project-page-wrap project-page-wrap-wide">
          <div className="project-page-crumb">
            <Link href="/">home</Link>
            <span aria-hidden="true">&nbsp;/&nbsp;</span>
            <span>work</span>
          </div>

          <h1 className="work-index-title">Work</h1>
          <p className="work-index-tagline">
            Applied AI systems — built solo, shipped to production. Each one ran (or runs) for real,
            not as a demo.
          </p>

          <ul className="work-index-list">
            {PROJECTS.map((project) => {
              const accent = getProjectAccent(project.slug);
              return (
                <li key={project.slug}>
                  <Link
                    href={`/work/${project.slug}`}
                    className="work-index-item"
                    style={{ "--accent": accent.hex } as React.CSSProperties}
                  >
                    <div className="work-index-item-top">
                      <span className="work-index-item-name">{project.name}</span>
                      <span className="work-index-item-year">{project.year}</span>
                    </div>
                    <p className="work-index-item-tag">{project.tagline}</p>
                    <p className="work-index-item-meta">{project.role}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </PageEnter>

      <footer className="project-page-footer">
        Mike Vidal · Miami · open to remote
      </footer>
    </main>
  );
}
