"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared hover/focus disclosure behaviour for the masthead dropdown tabs (Work,
 * Contact). Opens on pointer hover and on keyboard focus entering the group;
 * closes on pointer leave (after a short grace so the cursor can travel the gap
 * into the panel), on focus leaving the group, and on Escape.
 *
 * Spread `rootProps` on the wrapper element that contains BOTH the trigger and
 * the panel, so moving between them never leaves the group.
 */
export function useHoverMenu() {
  const [open, setOpen] = useState(false);
  // Grace timer so crossing the trigger→panel gap (the panel is out of flow, so
  // that gap briefly leaves the wrapper box) doesn't drop the menu.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }
  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const rootProps = {
    onMouseEnter: () => {
      cancelClose();
      setOpen(true);
    },
    onMouseLeave: scheduleClose,
    onFocus: () => {
      cancelClose();
      setOpen(true);
    },
    onBlur: (e: React.FocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
    },
  };

  return { open, setOpen, rootProps };
}
