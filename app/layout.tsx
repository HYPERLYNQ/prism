import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { OWNER_NAME, OWNER_ROLE, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import "./globals.css";

/**
 * Root layout — applied to every route.
 *
 * Responsibilities:
 *   • Load Space Grotesk + JetBrains Mono via `next/font` so they're inlined,
 *     subset-tuned, and exposed as CSS variables (`--font-grotesk`, `--font-mono`).
 *   • Declare the site-wide `Metadata` (title, description, openGraph + twitter
 *     defaults). Per-page metadata in route segments merges on top of this.
 *   • Declare the viewport theme colour so mobile browsers tint their chrome.
 */

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const description = "Applied AI — LLM-powered systems shipped to production. Solo.";
/* `OWNER_NAME` === `SITE_NAME` post brand-consolidation, so the title is just
 * "Mike Vidal — AI Engineer" rather than the duplicated triple. */
const fullTitle = `${OWNER_NAME} — ${OWNER_ROLE}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: fullTitle,
    template: `%s · ${SITE_NAME}`,
  },
  description,
  applicationName: SITE_NAME,
  authors: [{ name: OWNER_NAME, url: SITE_URL }],
  creator: OWNER_NAME,
  publisher: OWNER_NAME,
  keywords: [
    "AI Engineer",
    "Applied AI",
    "LLM",
    "human-in-the-loop",
    "tool use",
    "agentic pipelines",
    OWNER_NAME,
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: fullTitle,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: fullTitle,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  /* `cover` lets env(safe-area-inset-*) resolve to real values on notched
   * iPhones. Without this the safe-area usage in globals.css evaluates to
   * 0 and the masthead can clip under the notch in landscape. */
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <head>
        {/* Preload the hero's Helvetiker JSON typeface (~61 KB). Without this
         * hint the browser only discovers the file after the Three.js bundle
         * parses and calls FontLoader; preloading shaves that round-trip off
         * the LCP-critical onReady gate on the home page. `as="fetch"` +
         * `crossOrigin="anonymous"` are correct because FontLoader is just
         * `fetch().then(json)` under the hood, not a CSS font request. */}
        <link
          rel="preload"
          href="/fonts/helvetiker_bold.typeface.json"
          as="fetch"
          type="application/json"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {/* Skip-to-content link — visually hidden until a keyboard user
         * tabs into the page, then slides in from the top-left so the
         * masthead's 5+ tab stops can be bypassed. Targets `#main`
         * which every top-level route renders as its <main> landmark. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
