"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps a page (or any block) and triggers a CSS-driven stagger animation on mount.
 *
 * Usage (note `key` on the element — this is React's built-in remount mechanism):
 * ```tsx
 * <PageEnter key={slug}>
 *   <header>…</header>
 *   <main>…</main>
 * </PageEnter>
 * ```
 *
 * The `key={slug}` on the parent forces a remount of `PageEnter` whenever the
 * route changes, which re-runs the mount effect and re-plays the animation.
 * `PageEnter` itself doesn't declare a `routeKey` prop — the key lives on the
 * JSX element, not in the component's props.
 *
 * On mount, the wrapper element gets the `.is-entered` class one animation
 * frame later. Children with `.page-enter > *` rules in CSS read that class
 * to start their fade-up transitions.
 *
 * The single-rAF delay matters: it lets the browser commit the initial
 * (un-entered) styles to the layout/paint pipeline so the transition has a
 * "from" state to interpolate from. Without it, the browser would batch
 * the initial render + the class change and skip straight to the end state.
 */
export default function PageEnter({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const id = requestAnimationFrame(() => root.classList.add("is-entered"));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={rootRef} className="page-enter">
      {children}
    </div>
  );
}
