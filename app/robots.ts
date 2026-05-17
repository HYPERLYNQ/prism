import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * `app/robots.ts` — Next 16's built-in robots.txt convention.
 *
 * Allows every crawler to access every route, and points them at the sitemap
 * so they can find every project page. No `Disallow` rules — this is a public
 * portfolio.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
