import Link from "next/link";
import type { Metadata } from "next";
import Masthead from "@/components/nav/Masthead";

/**
 * Custom 404 — replaces Next's bare default with an on-brand editorial page.
 * Server component; uses the same tokens / type system as the rest of the site.
 */
export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      {/* No `activeTab` — 404 doesn't belong to any section. */}
      <Masthead />
      <main className="notfound">
        <div className="notfound-inner">
          <p className="notfound-code">404</p>
          <h1 className="notfound-title">This page slipped the net.</h1>
          <p className="notfound-sub">
            The link is broken, or the page moved. No model hallucinated it; it just
            isn&apos;t here.
          </p>
          <nav className="notfound-links" aria-label="Recover">
            <Link href="/">home</Link>
            <span className="notfound-sep" aria-hidden="true">·</span>
            <Link href="/work">work</Link>
            <span className="notfound-sep" aria-hidden="true">·</span>
            <Link href="/blog">writing</Link>
          </nav>
        </div>
      </main>
    </>
  );
}
