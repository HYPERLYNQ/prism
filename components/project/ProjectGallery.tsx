"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectDemo as ProjectDemoData } from "@/lib/projects";
import type { Swatch } from "@/lib/looks";

/**
 * Screenshot gallery — the `kind: "gallery"` demo variant, split out as a
 * client component for the carousel + lightbox interactions.
 *
 * Layout: a single-row film strip — fixed frame height, horizontal
 * scroll-snap, the next slide peeking at the edge so scrollability is
 * self-evident. Compact (one row regardless of shot count) vs the previous
 * stacked lead + two-up grid which ate most of a viewport per project.
 * Desktop gets prev/next arrows (scroll by one frame); touch just swipes
 * natively. Click any frame to open the lightbox at that shot.
 *
 * Performance:
 *   • Every image ships a 960w variant (suffix `-960.webp`, generated next
 *     to the master) wired through srcSet/sizes — strip frames render at
 *     ~600px so the 960 variant always wins; the 1920 master is reserved
 *     for the lightbox.
 *   • First frame is eager + high priority; the rest stay lazy. All decode
 *     async.
 *   • When the lightbox opens, the neighbours' full-size files are warmed
 *     in the background so prev/next feels instant.
 *
 * Lightbox: native <dialog> — ESC closes for free, ::backdrop is the ink
 * wash. Prev/next via buttons, ←/→ keys, or touch swipe; a counter keeps
 * orientation. Body scroll locks while open. Open/close animate via CSS
 * (@starting-style), disabled under prefers-reduced-motion.
 */

type GalleryDemo = Extract<ProjectDemoData, { kind: "gallery" }>;

type ProjectGalleryProps = {
  demo: GalleryDemo;
  accent: Swatch;
};

/** `/work/x/01-hero.webp` → `/work/x/01-hero-960.webp` (generated variant). */
const small = (src: string) => src.replace(/\.webp$/, "-960.webp");

export default function ProjectGallery({ demo, accent }: ProjectGalleryProps) {
  const style = { "--accent": accent.hex } as React.CSSProperties;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const swipeX = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const count = demo.images.length;

  /** Scroll the strip by ±one frame (first figure's width + gap). */
  const nudge = (dir: 1 | -1) => {
    const strip = stripRef.current;
    const first = strip?.querySelector<HTMLElement>(".pg-fig");
    if (!strip || !first) return;
    strip.scrollBy({ left: dir * (first.offsetWidth + 14), behavior: "smooth" });
  };

  const step = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + count) % count),
    [count],
  );

  const open = (i: number) => {
    setActive(i);
    setIsOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  // Scroll lock while the lightbox is open. The dialog's `close` event
  // (ESC included) funnels through onClose below, so this stays in sync.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Warm the neighbours' full-size files so prev/next is instant.
  useEffect(() => {
    if (!isOpen || count < 2) return;
    [1, -1].forEach((d) => {
      const img = new window.Image();
      img.src = demo.images[(active + d + count) % count].src;
    });
  }, [isOpen, active, count, demo.images]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  };

  const current = demo.images[active];

  return (
    <section className="project-gallery" style={style} aria-label="Product screenshots">
      {count > 1 && (
        <>
          <button
            type="button"
            className="pg-strip-nav pg-strip-prev"
            onClick={() => nudge(-1)}
            aria-label="Scroll to previous screenshot"
          >
            ←
          </button>
          <button
            type="button"
            className="pg-strip-nav pg-strip-next"
            onClick={() => nudge(1)}
            aria-label="Scroll to next screenshot"
          >
            →
          </button>
        </>
      )}
      <div className="pg-strip" ref={stripRef}>
        {demo.images.map((img, i) => (
          <figure key={img.src} className="pg-fig">
            <button
              type="button"
              className="pg-btn"
              onClick={() => open(i)}
              aria-label={`View larger: ${img.caption}`}
            >
              <span className="pg-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  srcSet={`${small(img.src)} 960w, ${img.src} 1920w`}
                  sizes="(max-width: 820px) 84vw, 620px"
                  alt={img.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                />
              </span>
            </button>
            <figcaption className="pg-cap">
              <span className="pg-cap-num">{String(i + 1).padStart(2, "0")}</span>
              {img.caption}
            </figcaption>
          </figure>
        ))}
      </div>
      {demo.note && <p className="pg-note">{demo.note}</p>}

      {/* Lightbox. Clicking the backdrop (the dialog element itself) closes. */}
      <dialog
        ref={dialogRef}
        className="pg-lightbox"
        onClose={() => setIsOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          swipeX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipeX.current === null) return;
          const dx = e.clientX - swipeX.current;
          swipeX.current = null;
          if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
        }}
        aria-label="Screenshot viewer"
      >
        <button type="button" className="pg-lightbox-close" onClick={close} aria-label="Close">
          ×
        </button>
        {count > 1 && (
          <>
            <button
              type="button"
              className="pg-lightbox-nav pg-lightbox-prev"
              onClick={() => step(-1)}
              aria-label="Previous screenshot"
            >
              ←
            </button>
            <button
              type="button"
              className="pg-lightbox-nav pg-lightbox-next"
              onClick={() => step(1)}
              aria-label="Next screenshot"
            >
              →
            </button>
          </>
        )}
        {current && (
          <figure style={style}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} alt={current.alt} decoding="async" />
            <figcaption>
              <span className="pg-cap-num">{String(active + 1).padStart(2, "0")}</span>
              {current.caption}
              <span className="pg-lightbox-count">
                {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </section>
  );
}
