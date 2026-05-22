"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Wraps a project page and orchestrates the cinematic scroll choreography:
 *
 *   1. **Banner intro** — on mount, the eyebrow, title, tagline, breadcrumb,
 *      status badge, and meta cells animate up with stagger.
 *   2. **Banner parallax** — banner content drifts up as the page scrolls so
 *      the hero feels layered.
 *   3. **Section reveals** — every `.project-section` fades + slides up as it
 *      enters the viewport (number first, then title, then body — 0.08s stagger).
 *   4. **Sticky section numbers** — the big numeral stays put as the body
 *      scrolls past, handled via native `position: sticky` in CSS (see
 *      `.project-section-header`). GSAP's `pin` clashed with the two-column
 *      grid (the header was removed from flow and the body floated).
 *   5. **Highlight stagger** — each `.project-highlights li` reveals in
 *      sequence when the highlights block enters view.
 *   6. **Stack chips pop-in** — chips scale + fade in with stagger.
 *   7. **CTA punch-in** — the CTA card scales up slightly as it enters view.
 *
 * Implementation notes:
 *   • Uses `gsap.to()` (not `gsap.from()`) because the CSS pre-paints elements
 *     at `opacity: 0` to prevent FOUC. `from()` reads the *current* style as
 *     the END state — with our CSS, that would lock everything at invisible.
 *   • Uses `gsap.context()` so all tweens / ScrollTriggers are cleaned up on
 *     unmount; essential for SPA route changes — otherwise we'd leak triggers
 *     and the next page would animate ghost elements.
 *   • Honors `prefers-reduced-motion`: when set, all elements are immediately
 *     placed at their final state (opacity 1, y 0) with no tween.
 */

gsap.registerPlugin(ScrollTrigger);

type ProjectAnimatorProps = {
  /** Re-keyed on slug change so the timeline replays per route. */
  routeKey: string;
  children: React.ReactNode;
};

/** All selectors that the CSS hides at `opacity: 0` so we can lift them
 * back to `opacity: 1` either via tween (animated) or instantly (reduced-motion). */
const REVEAL_SELECTORS = [
  ".project-hero-banner-eyebrow",
  ".project-hero-banner-title",
  ".project-hero-banner-tagline",
  ".project-page-crumb",
  ".project-status",
  ".meta > *",
  ".project-section-num",
  ".project-section-title",
  ".project-section-body",
  ".project-highlights li",
  ".stack-accent span",
  ".project-cta",
].join(", ");

export default function ProjectAnimator({ routeKey, children }: ProjectAnimatorProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // The `project-animated` class is now rendered in the SSR markup (see
    // JSX below) rather than added here — adding it post-mount caused a
    // flash: the content painted fully visible, then this effect ran and
    // the CSS opacity:0 rule snapped it hidden before GSAP faded it in.
    // Rendering the class server-side means the content is hidden from
    // the very first paint, so the animation is the only thing the user
    // ever sees.

    // Reduced-motion users: lift everything to its final state instantly and bail.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(root.querySelectorAll(REVEAL_SELECTORS), { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      // ── Initial offsets ──────────────────────────────────────────────
      // CSS pre-paints `opacity: 0`; GSAP adds the from-position (y offset,
      // scale) so each tween has a real motion path to animate over.
      // The banner title characters get pushed BELOW the mask line by 110%
      // of their own height so the "mask-reveal" looks like the glyphs are
      // sliding into existence rather than fading from below.
      // Banner title fades up as a single block (no per-char reveal).
      // The .char-mask spans still exist in the DOM for accessibility,
      // but we animate the parent title element instead.
      gsap.set(".project-hero-banner-title", { y: 18 });
      gsap.set(".project-hero-banner-title .char", { yPercent: 0, opacity: 1 });
      gsap.set(".project-hero-banner-eyebrow", { y: 14 });
      gsap.set(".project-hero-banner-tagline", { y: 14 });
      gsap.set(".project-page-crumb", { y: 12 });
      gsap.set(".project-status", { y: 14 });
      gsap.set(".meta > *", { y: 14 });
      gsap.set(".project-section-num", { y: 40, scale: 0.92 });
      gsap.set(".project-section-title", { y: 18 });
      gsap.set(".project-section-body", { y: 32, filter: "blur(4px)" });
      gsap.set(".project-highlights li:nth-child(odd)", { x: -28, y: 14 });
      gsap.set(".project-highlights li:nth-child(even)", { x: 28, y: 14 });
      gsap.set(".stack-accent span", { y: 18, scale: 0.86 });
      gsap.set(".project-cta", { scale: 0.94, y: 16 });

      // ── Banner intro — gradual fade-up ───────────────────────────────
      // Whole title fades up as one block. Eyebrow leads, title follows,
      // then tagline, then chrome (crumb / status / meta). Pacing tuned
      // so each element gets a moment of focus before the next starts.
      // Total settles in ~1.2s — readable, not rushed, not cinematic.
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .to(".project-hero-banner-eyebrow", { y: 0, opacity: 1, duration: 0.9 })
        .to(
          ".project-hero-banner-title",
          { y: 0, opacity: 1, duration: 1.0 },
          "-=0.65",
        )
        .to(
          ".project-hero-banner-tagline",
          { y: 0, opacity: 1, duration: 0.85 },
          "-=0.7",
        )
        .to(".project-page-crumb", { y: 0, opacity: 1, duration: 0.7 }, "-=0.6")
        .to(".project-status", { y: 0, opacity: 1, duration: 0.7 }, "-=0.55")
        .to(".meta > *", { y: 0, opacity: 1, duration: 0.75, stagger: 0.07 }, "-=0.55");

      // ── Banner parallax — inner content drifts up as the page scrolls ──
      gsap.to(".project-hero-banner-inner", {
        yPercent: -18,
        ease: "none",
        scrollTrigger: {
          trigger: ".project-hero-banner",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // ── Section entry stagger ────────────────────────────────────────
      // Each section's elements reveal with a small, choreographed sequence
      // when the section's top hits 82% of the viewport. Highlights items
      // come in from alternating sides (set via `gsap.set` above) which
      // looks more deliberate than uniform fade-up.
      gsap.utils.toArray<HTMLElement>(".project-section").forEach((section) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            toggleActions: "play none none none",
          },
          defaults: { ease: "power3.out" },
        });
        tl.to(section.querySelector(".project-section-num"), {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.85,
          ease: "expo.out",
        })
          .to(
            section.querySelector(".project-section-title"),
            { y: 0, opacity: 1, duration: 0.5 },
            "-=0.55",
          )
          .to(
            section.querySelector(".project-section-body"),
            { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8 },
            "-=0.55",
          );

        const items = section.querySelectorAll(".project-highlights li");
        if (items.length) {
          tl.to(
            items,
            {
              x: 0,
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.08,
              ease: "power3.out",
            },
            "-=0.45",
          );
        }
        const chips = section.querySelectorAll(".stack-accent span");
        if (chips.length) {
          tl.to(
            chips,
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.55,
              stagger: 0.05,
              ease: "back.out(1.6)",
            },
            "-=0.4",
          );
        }
        const cta = section.querySelector(".project-cta");
        if (cta) {
          tl.to(
            cta,
            { scale: 1, y: 0, opacity: 1, duration: 0.65, ease: "back.out(1.4)" },
            "-=0.4",
          );
        }
      });

      // ── Scrubbed section-number scale + drift ────────────────────────
      // Once a section is in view, its big number drifts upward and grows
      // *as you keep scrolling through the section's body*. Not a one-shot
      // — the transform is tied to scroll position via `scrub`. This is
      // the cinematic move the user asked for: the page reacts continuously
      // to scroll, not just on first entry.
      gsap.utils.toArray<HTMLElement>(".project-section").forEach((section) => {
        const num = section.querySelector(".project-section-num");
        if (!num) return;
        gsap.fromTo(
          num,
          { scale: 1, yPercent: 0, letterSpacing: "-0.04em" },
          {
            scale: 1.18,
            yPercent: -8,
            letterSpacing: "-0.06em",
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 60%",
              end: "bottom 40%",
              scrub: 0.6,
            },
          },
        );
      });

      // ── Reading progress bar at the top of the viewport ──
      const progress = root.querySelector<HTMLElement>(".project-progress-bar");
      if (progress) {
        gsap.to(progress, {
          scaleX: 1,
          ease: "none",
          transformOrigin: "left center",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.2,
          },
        });
      }

      // Re-measure after fonts/layout settle.
      ScrollTrigger.refresh();
    }, root);

    return () => ctx.revert();
  }, [routeKey]);

  return (
    <div ref={rootRef} className="project-animator project-animated">
      {/* No-JS fallback: the `project-animated` class hides the reveal
          targets at opacity:0 expecting GSAP to fade them in. If JS is
          disabled GSAP never runs, so this <noscript> style lifts them
          all back to visible. */}
      <noscript>
        <style>{`${REVEAL_SELECTORS.split(", ")
          .map((s) => `.project-animated ${s}`)
          .join(", ")}{opacity:1!important;transform:none!important;filter:none!important;}`}</style>
      </noscript>
      {/* Reading-progress sliver pinned to the top of the viewport. */}
      <div className="project-progress" aria-hidden="true">
        <div className="project-progress-bar" />
      </div>
      {children}
    </div>
  );
}
