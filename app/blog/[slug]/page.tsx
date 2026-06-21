import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPostSlugs } from "@/lib/blog";
import { blogPostingSchema } from "@/lib/jsonLd";
import PageEnter from "@/components/project/PageEnter";
import Masthead from "@/components/nav/Masthead";

/**
 * Blog post at `/blog/[slug]` — statically generated from the MDX in
 * `content/blog`. Emits per-post metadata (title, description, canonical,
 * article OpenGraph) and `BlogPosting` JSON-LD for SEO.
 */

type RouteParams = { slug: string };

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<RouteParams> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not found" };

  const { meta } = post;
  const canonical = `/blog/${slug}`;
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.tags,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: meta.title,
      description: meta.description,
      publishedTime: meta.date,
      modifiedTime: meta.updated ?? meta.date,
      authors: ["Mike Vidal"],
      tags: meta.tags,
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );

export default async function BlogPost({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFound();

  const { meta, Content } = post;

  return (
    <main id="main" className="project-page">
      {/* BlogPosting structured data — typed from post metadata, no user input. */}
      <script type="application/ld+json">{JSON.stringify(blogPostingSchema(meta, slug))}</script>
      <Masthead activeTab="writing" />

      <PageEnter>
        <article className="project-page-wrap">
          <div className="project-page-crumb">
            <Link href="/">home</Link>
            <span aria-hidden="true">&nbsp;/&nbsp;</span>
            <Link href="/blog">writing</Link>
            <span aria-hidden="true">&nbsp;/&nbsp;</span>
            <span>{slug}</span>
          </div>

          <header className="blog-post-head">
            <h1 className="blog-post-title">{meta.title}</h1>
            <div className="blog-post-meta">
              <time dateTime={meta.date}>{fmtDate(meta.date)}</time>
              {meta.tags && meta.tags.length > 0 && (
                <span className="blog-post-tags">{meta.tags.join(" · ")}</span>
              )}
            </div>
          </header>

          {meta.hero && (
            <figure className="blog-hero">
              <Image
                src={meta.hero}
                alt=""
                width={1600}
                height={900}
                priority
                sizes="(max-width: 760px) 100vw, 720px"
              />
            </figure>
          )}

          <div className="blog-prose">
            <Content />
          </div>
        </article>
      </PageEnter>

      <footer className="project-page-footer">Mike Vidal · Miami · open to remote + freelance</footer>
    </main>
  );
}
