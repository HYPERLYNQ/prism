import type { NextConfig } from "next";
import createMDX from "@next/mdx";

/**
 * Security headers applied to every response. Built as a single block so the
 * policy is auditable in one place.
 *
 *   • Content-Security-Policy — restrict where scripts, styles, fonts, images
 *     and connections can come from. `'unsafe-eval'` is unfortunately required
 *     for Next.js's runtime hydration chunks; without it the app fails to
 *     boot in some environments. `'unsafe-inline'` for styles is required
 *     because Next's flushed-during-SSR `<style>` blocks have no nonce. A
 *     nonce-based pipeline would be tighter but adds significant complexity.
 *
 *   • X-Frame-Options: DENY — disallow embedding the site in iframes; matches
 *     the CSP `frame-ancestors 'none'` for older browsers.
 *
 *   • X-Content-Type-Options: nosniff — block MIME sniffing.
 *
 *   • Referrer-Policy: strict-origin-when-cross-origin — modern, safe default.
 *
 *   • Permissions-Policy — disable camera / microphone / geolocation; the site
 *     never uses them.
 *
 *   • Strict-Transport-Security — only effective over HTTPS; harmless on
 *     localhost (browsers ignore it on insecure origins). Two-year max-age +
 *     `preload` so the domain can be submitted to the HSTS preload list.
 */
const cspDirectives = [
  "default-src 'self'",
  // `'unsafe-eval'` is required by Next.js hydration; `'unsafe-inline'` is required
  // because Next inlines small bootstrap / chunk-loader scripts in every document.
  // A nonce-based pipeline (Next middleware + nonce-threaded `<Script>` tags)
  // would let us drop `'unsafe-inline'`; not worth the complexity for a static
  // portfolio with no user input. Three.js's shader compile is a WebGL call
  // (`gl.compileShader`) and is NOT blocked by `script-src` either way.
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  // Next.js flushes critical CSS as inline <style> tags during SSR.
  "style-src 'self' 'unsafe-inline'",
  // `data:` covers any base64-inlined font payloads; `next/font` self-hosts.
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Two years + preload — only effective once the site is served over HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Let `.md` / `.mdx` modules in `content/` be imported as components (blog posts).
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Apply the security headers to every route, plus a long-lived immutable
  // cache for `/fonts/*` (hashed / versioned at the asset path — safe to
  // hold forever in browser + CDN). The hero's 61KB Helvetiker JSON file
  // sits under this rule so the preload hint pays off on repeat visits too.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

// `@next/mdx` wires up the MDX loader so blog posts in `content/blog/*.mdx` can
// be imported as React components (with an exported `metadata` object — no
// frontmatter parser needed). No remark/rehype plugins yet (basic prose + CSS).
const withMDX = createMDX({});

export default withMDX(nextConfig);
