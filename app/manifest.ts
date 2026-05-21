import type { MetadataRoute } from "next";
import { OWNER_ROLE, SITE_NAME } from "@/lib/siteConfig";

/**
 * `app/manifest.ts` — Next's web app manifest convention (`/manifest.webmanifest`).
 *
 * Minimal PWA/installability metadata so the site has a name, theme colour, and
 * icons when added to a home screen or surfaced by browsers. Not a ranking
 * factor, but it rounds out the mobile/identity story. Icons reference the
 * generated `icon.tsx` / `apple-icon.tsx` routes.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${OWNER_ROLE}`,
    short_name: SITE_NAME,
    description: "Applied AI — LLM-powered systems shipped to production.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
