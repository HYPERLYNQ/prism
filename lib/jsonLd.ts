/**
 * JSON-LD structured-data builders.
 *
 * Two schemas are emitted:
 *   • `Person` — on the home page; gives Google the data it needs to build a
 *     "knowledge card" style result for "Mike Vidal AI Engineer".
 *   • `CreativeWork` — one per project page; lets search engines understand
 *     each case study as a discrete piece of work with an author.
 *
 * Each helper returns a plain JS object. The page injects it as
 * `<script type="application/ld+json">{JSON.stringify(schema)}</script>` so
 * crawlers can read it without executing JavaScript.
 */

import type { Project } from "./projects";
import type { PostMeta } from "./blog";
import {
  OWNER_EMAIL,
  OWNER_GITHUB,
  OWNER_LOCATION,
  OWNER_NAME,
  OWNER_ROLE,
  SITE_NAME,
  SITE_URL,
} from "./siteConfig";

/**
 * `Person` schema — Mike Vidal as the site owner.
 * Reference: https://schema.org/Person
 */
export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: OWNER_NAME,
    url: SITE_URL,
    jobTitle: OWNER_ROLE,
    description: "Applied-AI engineer shipping LLM-powered systems to production.",
    email: `mailto:${OWNER_EMAIL}`,
    homeLocation: OWNER_LOCATION,
    // External profiles that corroborate identity for the knowledge panel.
    // TODO: add the LinkedIn URL here once confirmed.
    sameAs: [OWNER_GITHUB],
    worksFor: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  } as const;
}

/**
 * `CreativeWork` schema — one project. The `author` field references the
 * `Person` schema by name so search engines can connect the dots.
 * Reference: https://schema.org/CreativeWork
 */
export function creativeWorkSchema(project: Project) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    headline: project.tagline,
    description: project.summary,
    url: `${SITE_URL}/work/${project.slug}`,
    // `project.year` is a human range like "2025–26"; schema.org dateCreated
    // expects an ISO date, so emit just the first 4-digit year (invalid range
    // strings are silently ignored by crawlers otherwise).
    dateCreated: project.year.match(/\d{4}/)?.[0] ?? project.year,
    author: {
      "@type": "Person",
      name: OWNER_NAME,
      url: SITE_URL,
    },
    keywords: project.stack.join(", "),
  } as const;
}

/**
 * `BlogPosting` schema — one blog post. Gives search engines the authored
 * article data (headline, dates, author, keywords) so posts can surface as
 * rich results and reinforce author authority.
 * Reference: https://schema.org/BlogPosting
 */
export function blogPostingSchema(meta: PostMeta, slug: string) {
  const url = `${SITE_URL}/blog/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.description,
    url,
    datePublished: meta.date,
    dateModified: meta.updated ?? meta.date,
    keywords: meta.tags?.join(", "),
    author: { "@type": "Person", name: OWNER_NAME, url: SITE_URL },
    publisher: { "@type": "Person", name: OWNER_NAME, url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  } as const;
}
