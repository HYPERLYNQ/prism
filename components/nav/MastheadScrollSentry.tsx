"use client";

import { useEffect } from "react";

/**
 * Tiny client island that toggles `is-scrolled` on the document root once
 * the page has scrolled past a small threshold. The masthead reads this
 * via `html.is-scrolled .masthead { … }` and flips to an inverted dark
 * palette so it reads against scrolled content underneath.
 *
 * No state, no render output — `null` keeps it cheap to mount everywhere.
 * Listener is `passive` so it never blocks scroll; class writes are
 * rAF-batched and short-circuited when the value hasn't changed.
 */
export default function MastheadScrollSentry() {
  useEffect(() => {
    let ticking = false;
    let current = false;

    function apply() {
      ticking = false;
      const scrolled = window.scrollY > 8;
      if (scrolled === current) return;
      current = scrolled;
      document.documentElement.classList.toggle("is-scrolled", scrolled);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("is-scrolled");
    };
  }, []);

  return null;
}
