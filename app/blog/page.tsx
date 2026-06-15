import type { Metadata } from "next";
import Link from "next/link";
import { getAllPostsMeta } from "@/lib/blog";
import PageEnter from "@/components/project/PageEnter";
import Masthead from "@/components/nav/Masthead";

/**
 * Writing index at `/blog` — a reverse-chronological list of MDX posts.
 * Visually consistent with the `/work` index (same topbar, page-enter stagger,
 * editorial type).
 */

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes on applied AI — LLM pipelines, agents, and shipping real systems.",
  alternates: { canonical: "/blog" },
};

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );

export default async function BlogIndex() {
  const posts = await getAllPostsMeta();

  return (
    <main id="main" className="project-page">
      <Masthead activeTab="writing" />

      <PageEnter>
        <div className="project-page-wrap project-page-wrap-wide">
          <div className="project-page-crumb">
            <Link href="/">home</Link>
            <span aria-hidden="true">&nbsp;/&nbsp;</span>
            <span>writing</span>
          </div>

          <h1 className="work-index-title">Writing</h1>
          <p className="work-index-tagline">
            Notes on applied AI — LLM pipelines, agents, and what it actually takes to ship them.
          </p>

          {posts.length === 0 ? (
            <p className="blog-empty">No posts yet — first one's coming.</p>
          ) : (
            <ul className="blog-list">
              {posts.map(({ slug, meta }) => (
                <li key={slug}>
                  <Link href={`/blog/${slug}`} className="blog-item">
                    <div className="blog-item-top">
                      <span className="blog-item-title">{meta.title}</span>
                      <time className="blog-item-date" dateTime={meta.date}>
                        {fmtDate(meta.date)}
                      </time>
                    </div>
                    <p className="blog-item-desc">{meta.description}</p>
                    {meta.tags && meta.tags.length > 0 && (
                      <p className="blog-item-tags">{meta.tags.join(" · ")}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageEnter>

      <footer className="project-page-footer">Mike Vidal · Miami · open to remote + freelance</footer>
    </main>
  );
}
