"use client";

import { type RefObject } from "react";
import Link from "next/link";
import { type MatName, type Swatch } from "@/lib/looks";
import LookPanel from "./LookPanel";
import BottomStrip from "@/components/nav/BottomStrip";
import MobileIndexSheet from "@/components/nav/MobileIndexSheet";

/**
 * The DOM overlay that sits on top of the hero's WebGL canvas: the masthead +
 * picker (top-left), the status badge (top-right), the blurb (bottom-left), the
 * bottom index strip with the project list and contact links, the cursor hint,
 * and the initial loader.
 *
 * Pure presentation — every interactive piece of state is owned by the parent.
 *
 * The hint and loader sit OUTSIDE the `.ui` wrapper because they fade in/out on
 * their own (`ready` and `moved` flags) rather than the unified `.ui.in` stagger
 * the corner blocks use.
 */

type HeroOverlayProps = {
  /** Ref attached to the top-left container — used by the outside-click handler. */
  topLeftRef: RefObject<HTMLDivElement | null>;
  ready: boolean;
  moved: boolean;
  panelOpen: boolean;
  togglePanel: () => void;
  finish: MatName;
  bgColorName: string;
  heroColorName: string;
  debrisColorName: string;
  bgHex: string;
  onPickFinish: (id: MatName) => void;
  onPickBg: (swatch: Swatch) => void;
  onPickHero: (swatch: Swatch) => void;
  onPickDebris: (swatch: Swatch) => void;
};

export default function HeroOverlay(props: HeroOverlayProps) {
  const {
    topLeftRef,
    ready,
    moved,
    panelOpen,
    togglePanel,
    finish,
    bgColorName,
    heroColorName,
    debrisColorName,
    bgHex,
    onPickFinish,
    onPickBg,
    onPickHero,
    onPickDebris,
  } = props;

  return (
    <>
      <div className={`ui${ready ? " in" : ""}${panelOpen ? " panel-open" : ""}`}>
        <div className="corner-tl" ref={topLeftRef}>
          <div className="masthead">
            <span className="wm">MIKE VIDAL</span>
            <span className="m-sep">·</span>
            <span className="m-role">AI Engineer</span>
          </div>
          <LookPanel
            panelOpen={panelOpen}
            togglePanel={togglePanel}
            finish={finish}
            bgColorName={bgColorName}
            heroColorName={heroColorName}
            debrisColorName={debrisColorName}
            bgHex={bgHex}
            onPickFinish={onPickFinish}
            onPickBg={onPickBg}
            onPickHero={onPickHero}
            onPickDebris={onPickDebris}
          />
        </div>

        <div className="corner-tr">
          <div className="status">
            <span className="status-dot" />
            open to AI / FDE roles
          </div>
          {/* Credential block — concrete shipped proof paired with availability so
              the whole "hire-me" case sits in one corner, clear of the cycling
              wordmark and debris. Type matches the overlay system: a mono tracked
              label (like the role/status), grotesk value rows (like project names),
              a mono sub-line. The two top rows link to the relevant case studies. */}
          <div className="hero-cred">
            <span className="hero-cred-k">Shipped</span>
            <Link className="hero-cred-row" href="/work/wholesale-harmony">
              Shopify App Store <span className="hero-cred-arr" aria-hidden="true">→</span>
            </Link>
            <Link className="hero-cred-row" href="/work/synaptic">
              open source · npm <span className="hero-cred-arr" aria-hidden="true">→</span>
            </Link>
            <span className="hero-cred-sub">in production</span>
          </div>
        </div>

        <div className="corner-bl">
          <p>
            <b>Builds applied AI end-to-end</b> — outreach pipelines, persistent memory for Claude
            Code, virality intelligence, shipping desktops. Solo, production-grade.
          </p>
        </div>

        {/* Desktop / wide-viewport nav. Hidden at ≤820px (see globals.css) — the
            MobileIndexSheet below takes over with a bar + expandable sheet pattern.
            Shared with project pages; no `activeSlug` on home since nothing is "current". */}
        <BottomStrip />

        {/* Mobile-only nav. Hidden at >820px (see globals.css). */}
        <MobileIndexSheet />
      </div>

      <div className={`hint${ready ? " in" : ""}${moved ? " gone" : ""}`}>
        move your cursor · click the wordmark
      </div>
      <div className={`loader${ready ? " gone" : ""}`}>initializing</div>
    </>
  );
}
