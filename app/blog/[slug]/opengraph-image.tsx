import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/blog";
import { OG_IMAGE_SIZE, OWNER_NAME, OWNER_ROLE, SITE_NAME } from "@/lib/siteConfig";

/**
 * Per-post Open Graph image at `/blog/<slug>/opengraph-image` — the post title
 * on the dark brand card, so shared links render a proper preview.
 */

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

type RouteParams = { slug: string };

export default async function BlogPostOpenGraphImage(
  { params }: { params: Promise<RouteParams> },
) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFound();
  const { meta } = post;

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 6,
            fontWeight: 700,
            opacity: 0.85,
          }}
        >
          <div style={{ display: "flex" }}>{SITE_NAME.toUpperCase()}</div>
          <div style={{ display: "flex", opacity: 0.7, letterSpacing: 4, fontSize: 18 }}>WRITING</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: meta.title.length > 48 ? 64 : 80,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.04,
            maxWidth: 1000,
          }}
        >
          {meta.title}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.6,
          }}
        >
          {OWNER_NAME} · {OWNER_ROLE}
        </div>
      </div>
    ),
    { ...size },
  );
}
