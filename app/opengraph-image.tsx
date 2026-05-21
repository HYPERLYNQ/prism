import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE, OWNER_LOCATION, OWNER_NAME, OWNER_ROLE, SITE_NAME } from "@/lib/siteConfig";

/**
 * `app/opengraph-image.tsx` — Next 16's root Open Graph image convention.
 *
 * Generates the social-share preview for the home page: a 1200×630 PNG with
 * the brand lockup, owner identity, and a subtle dot-grid texture echoing the
 * hero's CSS background.
 *
 * `next/og` uses Satori under the hood; its CSS subset is stricter than the
 * browser's — every container with more than one child must have an explicit
 * `display: flex` (or `block`/`none`). All wrappers in this layout do.
 */

export const alt = `${OWNER_NAME} — ${OWNER_ROLE} · ${SITE_NAME}`;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0b0e10",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1.5px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Top row — brand lockup + status badge. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 8, fontWeight: 700 }}>
            {SITE_NAME.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "#fafcff" }} />
            <div style={{ display: "flex" }}>open to AI / FDE roles</div>
          </div>
        </div>

        {/* Middle — big name + tagline. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 0.95,
            }}
          >
            {OWNER_NAME}
          </div>
          <div style={{ display: "flex", fontSize: 32, opacity: 0.78, letterSpacing: -0.5 }}>
            {OWNER_ROLE} — applied AI, shipped to production.
          </div>
        </div>

        {/* Bottom — name + location line. Driven by siteConfig so it tracks the
            brand (was previously a hardcoded — and stale — name string). Use a
            literal `&` character (not the `&amp;` entity) because Satori passes
            JSX text through to its renderer without HTML-entity decoding. */}
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.5,
          }}
        >
          {`${OWNER_NAME} · ${OWNER_LOCATION}`}
        </div>
      </div>
    ),
    { ...size },
  );
}
