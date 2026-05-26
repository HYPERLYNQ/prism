import type { ProjectDemo as ProjectDemoData } from "@/lib/projects";
import type { Swatch } from "@/lib/looks";

/**
 * Demo embed slot on a project case study — renders a Loom screencast, MP4, or
 * static image / GIF above the body content. Highest-leverage proof point for
 * in-build / private projects: a 30-second loop of the product working closes
 * the "did they actually build this?" question faster than any GitHub link.
 *
 * Renders nothing if `demo` isn't set on the project, so the slot is invisible
 * until a Loom id / asset URL is dropped into `lib/projects.ts`.
 *
 * Pure server component (no client state) — the iframe / video do their own
 * lazy work in the browser.
 */

type ProjectDemoProps = {
  demo: ProjectDemoData | undefined;
  accent: Swatch;
};

export default function ProjectDemo({ demo, accent }: ProjectDemoProps) {
  if (!demo) return null;

  const style = { "--accent": accent.hex } as React.CSSProperties;

  return (
    <section className="project-demo" style={style} aria-label="Product demo">
      <div className="project-demo-frame">
        {demo.kind === "loom" && (
          <iframe
            // Loom's standard embed URL pattern; opts in to fullscreen.
            src={`https://www.loom.com/embed/${demo.id}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
            title={demo.alt ?? "Product demo"}
            // `allow="fullscreen"` is the modern equivalent of the deprecated
            // `allowfullscreen` boolean attribute used in Loom's docs.
            allow="fullscreen; clipboard-write"
            loading="lazy"
          />
        )}
        {demo.kind === "video" && (
          <video
            src={demo.src}
            poster={demo.poster}
            // Autoplay muted loops are the convention for portfolio demo
            // reels; non-blocking and respect `prefers-reduced-motion` via
            // the global media-query inside globals.css.
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={demo.alt ?? "Product demo"}
          />
        )}
        {demo.kind === "image" && (
          // For static screenshots and animated GIFs. `loading="lazy"` keeps
          // the case-study above-the-fold fast even with large assets.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={demo.src} alt={demo.alt} loading="lazy" />
        )}
      </div>
    </section>
  );
}
