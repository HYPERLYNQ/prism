import fs from "node:fs";
import path from "node:path";
import type { ComponentType } from "react";

/**
 * Blog content model. Posts are MDX files in `content/blog/<slug>.mdx`, each
 * exporting a `metadata` object (no YAML frontmatter — `@next/mdx` exposes ES
 * exports directly). This module enumerates them for the index / sitemap / RSS
 * and loads an individual post for its route.
 *
 * `fs` is used only to LIST slugs at build time (SSG); the post bodies are
 * dynamically imported so `@next/mdx` compiles them. Both run server-side.
 */

export type PostMeta = {
  /** SEO + display title. */
  title: string;
  /** Meta description / list summary (~150–160 chars for SEO). */
  description: string;
  /** ISO date published, e.g. "2026-05-22". */
  date: string;
  /** Optional ISO date last updated. */
  updated?: string;
  /** Topic tags (also rendered + used as keywords). */
  tags?: string[];
};

export type LoadedPost = {
  slug: string;
  meta: PostMeta;
  /** The compiled MDX body as a component. */
  Content: ComponentType;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** All post slugs (filenames without `.mdx`), newest first not guaranteed. */
export function getPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

/** Load one post (body + metadata), or null if the slug doesn't exist. */
export async function getPost(slug: string): Promise<LoadedPost | null> {
  try {
    const mod = await import(`@/content/blog/${slug}.mdx`);
    return { slug, meta: mod.metadata as PostMeta, Content: mod.default as ComponentType };
  } catch {
    return null;
  }
}

/** Every post's slug + metadata, sorted newest-first by `date`. */
export async function getAllPostsMeta(): Promise<{ slug: string; meta: PostMeta }[]> {
  const slugs = getPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const mod = await import(`@/content/blog/${slug}.mdx`);
      return { slug, meta: mod.metadata as PostMeta };
    }),
  );
  return posts.sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}
