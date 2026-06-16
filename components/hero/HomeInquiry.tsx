"use client";

import { useEffect, useState } from "react";
import { OWNER_EMAIL } from "@/lib/siteConfig";

/**
 * Project-inquiry lead capture on the home page. Two presentations, one form:
 *
 *   • Desktop / tablet (>600px): inline in the hero's bottom-right corner —
 *     headline + brief + email, always visible.
 *   • Mobile (≤600px): a compact CTA pill (the hero bottom is too tight for an
 *     always-open form); tapping it raises a bottom sheet with the same form,
 *     matching the look-console's sheet language. Body scroll locks while open.
 *
 * The `open` state only drives the mobile sheet; on desktop the panel is shown
 * unconditionally via CSS. Posts to /api/inquiry (emails the lead via Resend).
 */

type Status = "idle" | "sending" | "ok" | "error";

export default function HomeInquiry() {
  const [brief, setBrief] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — stays empty for humans
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false); // mobile sheet only

  // Lock body scroll + allow Escape while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, email, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("ok");
      } else {
        setStatus("error");
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setError("Network error — try again.");
    }
  }

  return (
    <div className={`home-cred home-inq${open ? " is-open" : ""}`}>
      {/* Mobile-only trigger. Hidden >600px (the inline panel shows instead). */}
      <button
        type="button"
        className="home-inq-trigger"
        aria-expanded={open}
        aria-controls="home-inq-panel"
        onClick={() => setOpen(true)}
      >
        <span className="home-inq-dot" aria-hidden="true" />
        <span>Available for freelance — pitch a project</span>
        <span className="home-inq-trigger-arr" aria-hidden="true">→</span>
      </button>

      {/* Mobile-only sheet backdrop. */}
      <button
        type="button"
        className="home-inq-backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={() => setOpen(false)}
      />

      <div id="home-inq-panel" className="home-inq-panel">
        <span className="home-inq-handle" aria-hidden="true" />
        <button
          type="button"
          className="home-inq-close"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <span aria-hidden="true">×</span>
        </button>

        {status === "ok" ? (
          <p className="home-inq-done">
            <span className="home-inq-dot" aria-hidden="true" />
            Got it — I&rsquo;ll reply within a day.
          </p>
        ) : (
          <form className="home-inq-form" onSubmit={onSubmit} noValidate>
            <div className="home-inq-head">
              <span className="home-inq-dot" aria-hidden="true" />
              <span className="home-inq-label">Available for freelance work</span>
            </div>

            <input
              type="text"
              className="home-inq-input"
              placeholder="what do you need built?"
              aria-label="What do you need built?"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              maxLength={2000}
            />

            <div className="home-inq-row">
              <input
                type="email"
                className="home-inq-input home-inq-email"
                placeholder="you@email.com"
                aria-label="Your email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                className="home-inq-send"
                disabled={status === "sending"}
                aria-label="Send inquiry"
              >
                {status === "sending" ? "···" : "→"}
              </button>
            </div>

            {/* Honeypot — visually hidden, off the tab order; bots fill it. */}
            <input
              type="text"
              className="home-inq-hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            {status === "error" && (
              <p className="home-inq-err" role="alert">
                {error} <a href={`mailto:${OWNER_EMAIL}`}>email instead →</a>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
