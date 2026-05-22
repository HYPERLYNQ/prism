import { getAllPostsMeta } from "@/lib/blog";
import { OWNER_NAME, SITE_NAME, SITE_URL } from "@/lib/siteConfig";

/**
 * `/feed.xml` — RSS 2.0 feed of blog posts. Helps discovery + indexing (readers,
 * aggregators, some crawlers). Built from the same MDX content as the blog, so
 * it's prerendered as static at build time.
 */
export const dynamic = "force-static";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const posts = await getAllPostsMeta();
  const updated = posts[0]?.meta.date ?? new Date().toISOString().slice(0, 10);

  const items = posts
    .map(({ slug, meta }) => {
      const url = `${SITE_URL}/blog/${slug}`;
      const pubDate = new Date(`${meta.date}T00:00:00Z`).toUTCString();
      return [
        "    <item>",
        `      <title>${esc(meta.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${esc(meta.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)} — Writing</title>
    <link>${SITE_URL}/blog</link>
    <description>Notes on applied AI — LLM pipelines, agents, and shipping real systems. By ${esc(OWNER_NAME)}.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(`${updated}T00:00:00Z`).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
