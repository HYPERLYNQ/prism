import type { MetadataRoute } from "next";
import { PROJECTS } from "@/lib/projects";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * `app/sitemap.ts` — Next 16's built-in sitemap convention.
 *
 * Emits `/sitemap.xml` with every public route:
 *   • `/` (home / hero)
 *   • `/work` (project index)
 *   • `/work/<slug>` for every project
 *
 * `lastModified` is set at build time, so the sitemap rebuilds whenever the
 * deploy does. Adjust priority + changeFrequency as the content changes
 * (project pages update more often than the static work index, etc.).
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/work`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const projectEntries: MetadataRoute.Sitemap = PROJECTS.map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...baseEntries, ...projectEntries];
}
