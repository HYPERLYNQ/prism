"use client";

import { useEffect, useRef, useState } from "react";
import { OWNER_EMAIL, OWNER_GITHUB, OWNER_LOCATION } from "@/lib/siteConfig";

/**
 * Contact tab in the masthead. Click → opens a small dropdown with GitHub /
 * Email / Location. Closes on Escape and outside click.
 *
 * Client component because of the open state and outside-click handling;
 * the rest of the Masthead stays server-rendered.
 */

type Props = { active?: boolean };

export default function MastheadContact({ active }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Click outside the menu closes it.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`masthead-contact${open ? " is-open" : ""}${active ? " is-active" : ""}`}
    >
      <button
        type="button"
        className={`masthead-tab masthead-tab-contact${active ? " is-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="masthead-tab-label">Contact</span>
        <span className="masthead-tab-meta">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="masthead-contact-menu" role="menu">
          <a
            href={OWNER_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="masthead-contact-item"
            role="menuitem"
          >
            <span className="masthead-contact-key">GH</span>
            <span className="masthead-contact-val">github.com/HYPERLYNQ</span>
            <span className="masthead-contact-ext" aria-hidden="true">↗</span>
          </a>
          <a
            href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent("Re: mikevidal.dev — let's talk")}`}
            className="masthead-contact-item"
            role="menuitem"
          >
            <span className="masthead-contact-key">EM</span>
            <span className="masthead-contact-val">{OWNER_EMAIL}</span>
            <span className="masthead-contact-ext" aria-hidden="true">→</span>
          </a>
          <div className="masthead-contact-item masthead-contact-static">
            <span className="masthead-contact-key">LO</span>
            <span className="masthead-contact-val">{OWNER_LOCATION}</span>
          </div>
        </div>
      )}
    </div>
  );
}
