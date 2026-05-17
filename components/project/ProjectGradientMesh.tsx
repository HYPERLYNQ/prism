import { PROJECTS } from "@/lib/projects";
import type { Swatch } from "@/lib/looks";

/**
 * Animated CSS gradient mesh that fills the project hero banner.
 *
 * Replaces the previous `MiniDebrisCanvas` (which recycled the home page's
 * 3-D debris pool). Pure CSS — three blurred radial blobs animated on
 * staggered keyframes, all tinted with the project's accent. Each project
 * gets a unique `--seed` derived from its index in `PROJECTS`, fed into
 * `animation-delay` so no two projects open at the same point in the cycle
 * — every project's mesh has its own flow.
 *
 * Why CSS-only instead of a `<canvas>`:
 *   • No JS / Three.js cost — the banner reads instantly.
 *   • Server-renderable — no client boundary.
 *   • Cheap on mobile GPUs (composited transforms + blurs).
 *
 * Accessibility: the mesh is decorative, marked `aria-hidden`. The
 * `prefers-reduced-motion` media query disables the keyframes in CSS so
 * users with motion sensitivity see a static gradient instead.
 *
 * Styles: `.project-hero-mesh*` in globals.css. Accent colour is read from
 * the `--mesh-accent` / `--mesh-accent-deep` custom properties written
 * inline by this component.
 */

type ProjectGradientMeshProps = {
  accent: Swatch;
  slug: string;
};

export default function ProjectGradientMesh({ accent, slug }: ProjectGradientMeshProps) {
  // Deterministic seed from the project's position in PROJECTS — drives the
  // animation-delay so every project's mesh sits at a different point in its
  // cycle on first paint. `-1` fallback if (somehow) the slug isn't found.
  const seed = Math.max(0, PROJECTS.findIndex((p) => p.slug === slug));

  return (
    <div
      className="project-hero-mesh"
      style={{
        "--mesh-accent": accent.hex,
        "--mesh-accent-deep": accent.deep,
        "--mesh-delay": `${-seed * 4.3}s`,
      } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="project-hero-mesh-blob project-hero-mesh-blob-a" />
      <span className="project-hero-mesh-blob project-hero-mesh-blob-b" />
      <span className="project-hero-mesh-blob project-hero-mesh-blob-c" />
      {/* A faint grain overlay adds texture without competing with the title. */}
      <span className="project-hero-mesh-grain" />
    </div>
  );
}
