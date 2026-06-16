"use client";

import { OWNER_EMAIL, OWNER_GITHUB, OWNER_LOCATION } from "@/lib/siteConfig";
import { useHoverMenu } from "./useHoverMenu";

/**
 * Contact tab in the masthead. Hover/focus reveals a small dropdown with GitHub
 * / Email / Location — same disclosure behaviour as the Work tab (shared via
 * useHoverMenu), so all the dropdown tabs open on hover consistently. The
 * trigger also toggles on click as a touch fallback (unlike Work, it has no
 * destination to navigate to). Closes on pointer leave, focus-out, and Escape.
 *
 * Client component for the open state; the rest of the Masthead stays
 * server-rendered.
 */

type Props = { active?: boolean };

export default function MastheadContact({ active }: Props) {
  const { open, setOpen, rootProps } = useHoverMenu();

  return (
    <div
      className={`masthead-contact${open ? " is-open" : ""}${active ? " is-active" : ""}`}
      {...rootProps}
    >
      {/* Disclosure pattern (not WAI-ARIA menu): the trigger keeps
          aria-expanded and aria-controls; the panel drops the menu role since
          arrow-key navigation / typeahead aren't implemented. */}
      <button
        type="button"
        className={`masthead-tab masthead-tab-contact${active ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls="masthead-contact-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="masthead-tab-label">Contact</span>
        <span className="masthead-tab-meta">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div id="masthead-contact-menu" className="masthead-contact-menu">
          <a
            href={OWNER_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="masthead-contact-item"
          >
            <span className="masthead-contact-key">GH</span>
            <span className="masthead-contact-val">github.com/HYPERLYNQ</span>
            <span className="masthead-contact-ext" aria-hidden="true">↗</span>
          </a>
          <a
            href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent("Re: mikevidal.dev — let's talk")}`}
            className="masthead-contact-item"
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
