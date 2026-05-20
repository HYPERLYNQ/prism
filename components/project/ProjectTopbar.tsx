import Link from "next/link";

/**
 * Slim brand header rendered at the top of every `/work` page.
 *
 * Intentionally minimal — the **project switcher lives in the persistent
 * bottom strip** (`BottomStrip` + `MobileIndexSheet`), the same place it
 * lives on the home page. The old version of this component also held a
 * project switcher, which meant the nav "flipped" from bottom on home to
 * top on project pages — confusing. This trimmed version just gives a brand
 * mark with a home link and quiet utility links.
 *
 * Sticky so the brand stays anchored as the case study scrolls.
 *
 * Server component — no client state.
 */
export default function ProjectTopbar() {
  return (
    <header className="page-topbar">
      <Link href="/" className="page-topbar-home" aria-label="Home">MIKE VIDAL</Link>
    </header>
  );
}
