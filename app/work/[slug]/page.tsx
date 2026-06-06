import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECTS, getProject, getProjectAccent } from "@/lib/projects";
import { creativeWorkSchema } from "@/lib/jsonLd";
import ProjectAnimator from "@/components/project/ProjectAnimator";
import ProjectHeroBanner from "@/components/project/ProjectHeroBanner";
import ProjectDemo from "@/components/project/ProjectDemo";
import ProjectMeta from "@/components/project/ProjectMeta";
import ProjectPrevNext from "@/components/project/ProjectPrevNext";
import Masthead from "@/components/nav/Masthead";

/**
 * Project case-study page at `/work/[slug]`.
 *
 * Statically generated at build time for every project — `generateStaticParams`
 * yields one entry per project slug. Unknown slugs surface as 404.
 *
 * Composition (post tabbed-masthead refactor):
 *   • `Masthead` — site-wide top bar with the Work tab active and the project
 *                  name shown alongside the tab (replaces the old ProjectTopbar)
 *   • `ProjectAnimator` — wraps the body for scroll-reveal staggers
 *   • `ProjectHeroBanner` — coloured banner with title + 3-D mini canvas
 *   • Breadcrumb + optional `ProjectDemo` + `ProjectMeta` + `ProjectPrevNext`
 */

type RouteParams = { slug: string };

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<RouteParams> },
): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Not found" };

  const canonical = `/work/${project.slug}`;
  const title = project.name;
  const description = project.tagline;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const project = getProject(slug);
  // `notFound()` throws — the explicit return convinces TypeScript that the rest
  // of this function only runs when `project` is defined.
  if (!project) return notFound();

  const accent = getProjectAccent(project.slug);

  const schema = creativeWorkSchema(project);

  return (
    <main
      id="main"
      className="project-page"
      // Page-level accent — read by every nested rule (progress bar, status
      // badge, section numbers, stack chips, CTA card). Single source of truth
      // for the project's brand colour on the page.
      style={{ "--accent": accent.hex } as React.CSSProperties}
    >
      {/*
        Structured data — JSON-LD for this project (CreativeWork).
        Content is JSON.stringify'd from typed project data with no user input
        anywhere in the chain, so there's no XSS surface.
      */}
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <Masthead activeTab="work" activeProject={project.slug} />

      <ProjectAnimator routeKey={project.slug}>
        <ProjectHeroBanner project={project} accent={accent} />

        <div className="project-page-wrap">
          <div className="project-page-crumb">
            <Link href="/">home</Link>
            <span aria-hidden="true">&nbsp;/&nbsp;</span>
            <Link href="/work">work</Link>
            <span aria-hidden="true">&nbsp;/&nbsp;</span>
            <span>{project.slug}</span>
          </div>

          {/* Demo embed — highest-leverage proof for in-build/private projects.
              Renders nothing until a `demo` field lands on the project. */}
          <ProjectDemo demo={project.demo} accent={accent} />

          <ProjectMeta project={project} accent={accent} />

          <ProjectPrevNext currentSlug={project.slug} />
        </div>
      </ProjectAnimator>

      <footer className="project-page-footer">
        Mike Vidal · Miami · open to remote
      </footer>
    </main>
  );
}
