import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getProject, getProjectAccent } from "@/lib/projects";
import { OG_IMAGE_SIZE, OWNER_NAME, OWNER_ROLE, SITE_NAME } from "@/lib/siteConfig";

/**
 * Per-project Open Graph image at `/work/<slug>/opengraph-image`.
 *
 * Mirrors the on-page banner: a 1200×630 PNG with the project's accent colour
 * as the background, the project name in big display type, year + role
 * underneath, and the brand lockup in a corner.
 *
 * Next passes the route params; we look up the project and bail with 404 if
 * the slug is unknown — that path won't be statically generated anyway, but
 * the guard is here as a defensive net.
 *
 * Satori (the engine behind `ImageResponse`) requires explicit `display`
 * declarations on any container with more than one child — every wrapper here
 * sets `display: flex`.
 */

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

type RouteParams = { slug: string };

export default async function ProjectOpenGraphImage(
  { params }: { params: Promise<RouteParams> },
) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return notFound();
  const accent = getProjectAccent(slug);
  const textColor = accent.dark ? "#ffffff" : "#0b0e10";

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
          background: `linear-gradient(135deg, ${accent.hex} 0%, ${accent.deep} 100%)`,
          color: textColor,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top — brand lockup + year/role eyebrow. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 6,
            fontWeight: 700,
            opacity: 0.86,
          }}
        >
          <div style={{ display: "flex" }}>{SITE_NAME.toUpperCase()}</div>
          <div style={{ display: "flex", opacity: 0.72, letterSpacing: 4, fontSize: 18 }}>
            {project.year} · {project.role}
          </div>
        </div>

        {/* Middle — eyebrow + big name + tagline. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 4,
              textTransform: "uppercase",
              opacity: 0.72,
            }}
          >
            Case study
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 128,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 0.92,
            }}
          >
            {project.name}
          </div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, opacity: 0.88, maxWidth: 900 }}>
            {project.tagline}
          </div>
        </div>

        {/* Bottom — author byline. */}
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.62,
          }}
        >
          {OWNER_NAME} · {OWNER_ROLE}
        </div>
      </div>
    ),
    { ...size },
  );
}
