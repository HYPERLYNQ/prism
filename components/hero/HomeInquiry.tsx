"use client";

import { useState } from "react";
import { OWNER_EMAIL } from "@/lib/siteConfig";

/**
 * Bottom-right project-inquiry capture on the home page — replaces the static
 * contact links with an active lead grab: a one-line brief + email that posts
 * to /api/inquiry (emails the lead to the owner via Resend). Frames the hero
 * opposite the value-prop blurb.
 *
 * Reuses the `.home-cred` container for position + the legibility scrim; the
 * form-specific styling is `.home-inq*`. Client component for the form state.
 *
 * NOTE: `.home-cred` is hidden ≤600px by the bottom-band layout, so this is
 * desktop/tablet only for now — mobile lead capture is a separate decision.
 */

type Status = "idle" | "sending" | "ok" | "error";

export default function HomeInquiry() {
  const [brief, setBrief] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — stays empty for humans
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

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
    <div className="home-cred home-inq">
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

          {/* Honeypot — visually hidden, off the tab order; bots fill it, humans don't. */}
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
              {error}{" "}
              <a href={`mailto:${OWNER_EMAIL}`}>email instead →</a>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
