/**
 * Site-wide configuration — the single source of truth for the production URL,
 * brand name, owner identity, and external links.
 *
 * Consumed by:
 *   • `app/layout.tsx` for `metadataBase` + the root metadata defaults
 *   • `app/sitemap.ts` to build absolute URLs
 *   • `app/robots.ts` to point at the sitemap
 *   • `lib/jsonLd.ts` for `Person` / `CreativeWork` schema
 *
 * Override the URL via `NEXT_PUBLIC_SITE_URL` (e.g. when deploying preview branches).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mikevidal.dev").replace(/\/$/, "");
/**
 * The portfolio is branded as the person, not an agency. `SITE_NAME` and
 * `OWNER_NAME` deliberately resolve to the same string so the schema/OG
 * outputs are coherent: a personal portfolio's "site name" *is* the person.
 *
 * The public-facing name is "Mike Vidal" (the casual first name is the
 * tech-industry norm and matches the domain `mikevidal.dev` + LinkedIn).
 * Legal name "Michael Vidal" is only used on offer/background-check
 * paperwork, never on the site.
 */
export const SITE_NAME = "Mike Vidal";
export const OWNER_NAME = "Mike Vidal";
export const OWNER_ROLE = "AI Engineer";
export const OWNER_LOCATION = "Miami · open to remote";
export const OWNER_EMAIL = "michael@kromeandco.com";
export const OWNER_GITHUB = "https://github.com/HYPERLYNQ";

/** Default OG/Twitter image dimensions — Next conventions for `opengraph-image`. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
