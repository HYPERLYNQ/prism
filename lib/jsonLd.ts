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
import {
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
    homeLocation: OWNER_LOCATION,
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
    dateCreated: project.year,
    author: {
      "@type": "Person",
      name: OWNER_NAME,
      url: SITE_URL,
    },
    keywords: project.stack.join(", "),
  } as const;
}
