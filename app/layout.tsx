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

const description = "Applied AI — LLM systems shipped to production. Solo.";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
