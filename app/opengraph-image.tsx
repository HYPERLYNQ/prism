import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE, OWNER_NAME, OWNER_ROLE, SITE_NAME } from "@/lib/siteConfig";

/**
 * `app/opengraph-image.tsx` — Next 16's root Open Graph image convention.
 *
 * The 1200×630 social-share card for the home page. Echoes the hero's world: a
 * dark stage, a fine dot-grid, chrome spheres standing in for the 3D debris, a
 * bold value-prop headline, and a segmented "boot" bar nodding to the loader.
 *
 * `next/og` uses Satori, whose CSS subset is stricter than the browser's: every
 * container with more than one child needs an explicit `display` (flex here),
 * and there are no web fonts loaded (kept deliberately dependency-free so the
 * production build can't fail on a font fetch). The boot bar is built from divs
 * rather than block glyphs so it never renders as tofu in the fallback font.
 */

export const alt = `${OWNER_NAME} — ${OWNER_ROLE} · ${SITE_NAME}`;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

const INK = "#F4F2EC";
const BG = "#0A0E14";
const ACCENT = "#C8F050"; // chartreuse — the brand's signal colour

/** A metallic sphere built from a single radial gradient — stands in for the
 *  hero's chrome debris. */
function Sphere({
  size: d,
  top,
  left,
  highlight = "36% 30%",
}: {
  size: number;
  top: number;
  left: number;
  highlight?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: d,
        height: d,
        borderRadius: d,
        display: "flex",
        background: `radial-gradient(circle at ${highlight}, #ffffff 0%, #d2d7dd 15%, #878d96 42%, #2b3038 74%, #0c0f15 100%)`,
        boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
      }}
    />
  );
}

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
          padding: 68,
          background: BG,
          color: INK,
          fontFamily: "sans-serif",
          position: "relative",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.4px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Accent glow + chrome debris, behind the text. */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 620,
            display: "flex",
            background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 62%)`,
          }}
        />
        <Sphere size={300} top={188} left={812} />
        <Sphere size={104} top={92} left={1056} highlight="40% 32%" />
        <Sphere size={66} top={430} left={770} highlight="42% 34%" />

        {/* Top eyebrow — identity + domain. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 21,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 11, height: 11, borderRadius: 11, background: ACCENT, display: "flex" }} />
            <div style={{ display: "flex" }}>
              {OWNER_NAME} — {OWNER_ROLE}
            </div>
          </div>
          <div style={{ display: "flex", opacity: 0.55 }}>mikevidal.dev</div>
        </div>

        {/* Headline block. */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
          <div style={{ display: "flex", width: 60, height: 5, background: ACCENT, marginBottom: 26 }} />
          <div
            style={{
              display: "flex",
              fontSize: 86,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 0.97,
            }}
          >
            Applied AI, shipped to production.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 27,
              fontWeight: 500,
              letterSpacing: -0.3,
              opacity: 0.72,
              maxWidth: 640,
            }}
          >
            LLM pipelines, agents, persistent memory — real products, not demos.
          </div>
        </div>

        {/* Bottom boot bar — segmented, all filled (100%). */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, letterSpacing: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, color: ACCENT, fontWeight: 700 }}>
            <div style={{ display: "flex" }}>boot</div>
            {/* play-triangle (▸) as inline SVG — the glyph isn't in the fallback
                font, and Satori doesn't render the CSS border-triangle trick. */}
            <svg width="12" height="14" viewBox="0 0 12 14" style={{ display: "flex" }}>
              <polygon points="0,0 12,7 0,14" fill={ACCENT} />
            </svg>
          </div>
          <div style={{ display: "flex", opacity: 0.8 }}>compiled</div>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                style={{ width: 16, height: 16, borderRadius: 2, background: INK, opacity: 0.92, display: "flex" }}
              />
            ))}
          </div>
          <div style={{ display: "flex", opacity: 0.8 }}>100%</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
