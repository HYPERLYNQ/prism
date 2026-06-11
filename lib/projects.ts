/**
 * Project case-study data + a small helper for the per-project accent colour.
 *
 * Each entry powers three places:
 *   1. The hero's bottom index strip (project name → link).
 *   2. The `/work` index page (name, tagline, year, role).
 *   3. The `/work/[slug]` detail page (everything).
 *
 * **Framing rule (important):** these projects are multi-STAGE LLM pipelines / applied-AI
 * systems with human-in-the-loop. They are NOT "multi-agent" systems (no agent-to-agent
 * coordination, no supervisor pattern, no AutoGen / CrewAI / LangGraph). Keep the
 * language honest — under-sell accurately rather than over-sell and fail in interview.
 */

import { SWATCHES, type Swatch } from "./looks";

/**
 * A visual demo embedded on the case study — proof the product actually works.
 * Recruiters spend 30–60 seconds per portfolio; a short loop is the highest-
 * leverage credibility signal for in-build/private projects (no GitHub link
 * needed). Drop the embed id / src in once recorded; the field is optional and
 * the demo slot renders nothing until a value is present.
 */
export type ProjectDemo =
  | { kind: "loom"; id: string; alt?: string }
  | { kind: "video"; src: string; poster?: string; alt?: string }
  | { kind: "image"; src: string; alt: string }
  /**
   * 2–3 product screenshots rendered as an editorial gallery: lead shot
   * full-width, the rest in a two-up grid. `caption` renders in the
   * meta-key style under each frame ("Approval queue", "Analytics", …).
   * `note` (optional) renders one quiet provenance line under the grid —
   * use it for honesty flags like "demo data" or "marketing site".
   */
  | {
      kind: "gallery";
      images: { src: string; alt: string; caption: string }[];
      note?: string;
    };

/** One project. Keep the field set minimal; new fields here ripple through every consumer. */
export type Project = {
  /** URL slug under `/work/<slug>` — kebab-case, no spaces. */
  slug: string;
  /** Display name — usually matches the slug. */
  name: string;
  /** Single-line summary shown under the title and on the index. */
  tagline: string;
  /** Free-form year string (`"2025"`, `"2025–26"`, etc.). */
  year: string;
  /** Short role descriptor (`"Solo"`, `"Solo — design, build, ship"`, …). */
  role: string;
  /** Technologies / techniques rendered as chips. */
  stack: string[];
  /** 2–4 sentence body. Split on blank lines for multiple paragraphs. */
  summary: string;
  /** 3–5 bullet highlights rendered as a list. */
  highlights: string[];
  /** Optional external link (live site / repo / writeup). */
  link?: { label: string; href: string };
  /**
   * Short proof statement (e.g. `"Live in the App Store"`, `"Open source · v1.7.6"`,
   * `"Pre-release · v0.1.5"`, `"In active build"`). Keep it punchy — it renders
   * large + accent-coloured as the lead of the meta block on the detail page, so
   * trailing detail ("· private repo", "on npm") just makes the headline wordy.
   * Honest, specific proof — no faked metrics.
   */
  status?: string;
  /**
   * Accent swatch name (must match a `SWATCHES` entry in `lib/looks.ts`).
   * Drives the banner gradient mesh, the work-index left-bar hover colour, and
   * the active-project highlight in the mobile sheet. Explicit per project so
   * brand-meaningful pairings (e.g. wholesale-harmony = deep-teal,
   * synaptic = chartreuse) don't drift if `PROJECTS` is reordered.
   */
  accent: string;
  /**
   * Optional short demo embedded above the case-study body. Loom screencast,
   * MP4, or static image / GIF. See ProjectDemo. Render slot stays empty until
   * a value lands here.
   */
  demo?: ProjectDemo;
  /**
   * One-line "the engineering call I'd talk about in interview." Pulled out
   * above the highlights so the strongest technical decision lands in a
   * 60-second skim, not buried in the summary paragraph.
   */
  lede?: string;
  /**
   * Source visibility — drives the "Code" cell in the project meta grid and
   * the visibility tags on the /resume page. Honest, never apologetic; private
   * repos are normal for commercial SaaS.
   */
  visibility?: "open-source" | "private";
};

/**
 * All projects, in display order.
 *
 * Order rationale: flagships first (open-source synaptic, then App-Store-live
 * wholesale-harmony), then the in-active-build cluster (sonar → fever → hotship),
 * with juice rounding it out. Accent pairings are locked to each project (not
 * its position) so brand-meaningful colours stay correct even if order changes:
 *
 *   synaptic           → chartreuse    (smart green-yellow — brand keeps its tint)
 *   wholesale-harmony  → deep-teal     (sophisticated cool blue-green)
 *   sonar              → burnt-orange  (warm, outreach energy)
 *   fever              → oxblood       (heat / virality, deep red)
 *   hotship            → aubergine     (cool deep purple — distinct cool note)
 *   juice              → gold-leaf     (literal citrus — refined gold tone)
 */
export const PROJECTS: Project[] = [
  {
    slug: "synaptic",
    name: "synaptic",
    tagline: "Persistent, file-based memory for Claude Code — context that survives across sessions.",
    year: "2025–26",
    role: "Solo",
    accent: "chartreuse",
    stack: [
      "TypeScript",
      "@modelcontextprotocol/sdk",
      "sqlite-vec",
      "Transformers.js (embeddings)",
      "Zod",
      "Vitest",
      "Node 22+",
    ],
    status: "Open source · v1.7.6",
    visibility: "open-source",
    lede:
      "Hybrid retrieval entirely on-device — BM25 + semantic vectors via sqlite-vec and Transformers.js, zero cloud dependencies.",
    summary:
      "A memory layer for Claude Code: captures decisions, corrections, and project facts as structured records on disk and recalls the relevant ones at the start of a new session, so context isn't lost between conversations. Hybrid retrieval — BM25 keyword + semantic vector (sqlite-vec + Transformers.js running locally). Shipped as an MCP server, published to npm as @hyperlynq/synaptic, runs entirely local with zero cloud dependencies.",
    highlights: [
      "File-based long-term memory — survives across sessions and machines",
      "Hybrid retrieval: BM25 keyword + semantic vector via sqlite-vec + Transformers.js",
      "Capture & recall: insights, corrections, project facts, references, rules",
      "MCP server with save / search / session / rules tools",
      "Open source, published to npm, zero cloud — runs fully local",
    ],
    link: { label: "GitHub", href: "https://github.com/HYPERLYNQ/synaptic" },
    demo: {
      kind: "gallery",
      note: "Captured from getsynaptic.dev",
      images: [
        {
          src: "/work/synaptic/02-quickstart.webp",
          alt: "Quick-start terminal — one-line plugin install",
          caption: "Quick start",
        },
        {
          src: "/work/synaptic/03-features.webp",
          alt: "Feature grid — recall, hybrid search, git intelligence, checkpoints",
          caption: "Feature grid",
        },
        {
          src: "/work/synaptic/01-hero.webp",
          alt: "synaptic landing hero — persistent memory for Claude Code",
          caption: "getsynaptic.dev",
        },
      ],
    },
  },
  {
    slug: "wholesale-harmony",
    name: "wholesale-harmony",
    tagline: "Multi-tenant B2B customer-approval + wholesale-pricing SaaS for Shopify. Live in the App Store.",
    year: "2024–26",
    role: "Solo — founder, engineer, shipped to App Store",
    accent: "deep-teal",
    stack: [
      "TypeScript",
      "React 18 + React Router 7",
      "Shopify App Bridge + Polaris",
      "Shopify App React Router framework",
      "Shopify Functions (extensions)",
      "Prisma 6 + session storage",
      "Vite 6",
    ],
    status: "Live · Shopify App Store",
    visibility: "private",
    lede:
      "Shopify Functions enforce purchase restrictions server-side, so unapproved customers can't reach checkout — platform-level, not client-side.",
    summary:
      "A multi-tenant B2B customer-approval and wholesale-pricing app for Shopify, live in the Shopify App Store. Merchants run tiered pricing, custom registration forms (license #, tax ID, business documents), and automated approval workflows. Shopify Functions in the extensions workspace enforce purchase restrictions and apply wholesale discounts server-side, so unapproved customers can't reach checkout. Built on the Shopify App React Router framework with Prisma session storage. Marketing site at wholesaleharmony.com — App Store listing has a product video + screenshots.",
    highlights: [
      "Live in the Shopify App Store — multi-tenant, paying merchants",
      "Custom B2B registration forms with field validation (license #, tax ID, etc.)",
      "Automated approval workflow with merchant-side review queue",
      "Shopify Functions (purchase-restriction + wholesale-discount) for platform-level enforcement",
      "Embedded Polaris admin app + customer-facing storefront blocks",
      "Workspaces monorepo: main app + extensions for Shopify Functions",
    ],
    link: { label: "Shopify App Store", href: "https://apps.shopify.com/wholesale-harmony" },
    demo: {
      kind: "gallery",
      note: "Admin app shown with demo merchant data · site shots from wholesaleharmony.com",
      images: [
        {
          src: "/work/wholesale-harmony/04-app-registrations.webp",
          alt: "Admin app — B2B registration approval queue with pending customers",
          caption: "Approval queue — admin app",
        },
        {
          src: "/work/wholesale-harmony/06-app-customer-types.webp",
          alt: "Admin app — customer type tiers with registration form builder",
          caption: "Customer types",
        },
        {
          src: "/work/wholesale-harmony/05-app-pricing.webp",
          alt: "Admin app — wholesale pricing rules and price lists",
          caption: "Pricing engine",
        },
        {
          src: "/work/wholesale-harmony/01-hero.webp",
          alt: "Wholesale Harmony marketing site hero",
          caption: "wholesaleharmony.com",
        },
        {
          src: "/work/wholesale-harmony/02-features.webp",
          alt: "Core features — registration, pricing, approvals, storefront",
          caption: "Core features",
        },
      ],
    },
  },
  {
    slug: "sonar",
    name: "sonar",
    tagline:
      "Autonomous B2B intent monitoring + outreach — a multi-stage LLM pipeline with human-in-the-loop approval.",
    year: "2025–26",
    role: "Solo — design, build, ship",
    accent: "burnt-orange",
    stack: [
      "Node.js",
      "Next.js 16",
      "Sonnet 4.6 (tool-use, structured output, prompt caching)",
      "multi-source ingestion",
      "HITL approval (Telegram)",
      "Smartlead",
      "SQLite",
    ],
    status: "In active build",
    visibility: "private",
    lede:
      "One Sonnet-4.6 classifier with tool-use, structured output, and prompt caching — not a multi-agent system. Human approval via Telegram before any email ships.",
    summary:
      "Pings public channels — App Store reviews, Reddit, Shopify Community, job boards — for high-intent signals, classifies leads with a Sonnet-4.6 classifier (tool-use + structured output + prompt caching), finds contacts, drafts personalised outreach, routes each draft through a Telegram human-approval gate, and sends accepted ones via Smartlead with webhook reply tracking. End-to-end pipeline running unattended; humans only see the approval queue.",
    highlights: [
      "Multi-stage pipeline: scrape → classify → email-find → draft → approve → send",
      "Single Sonnet-4.6 classifier with tool-use, structured output, and prompt caching — not a multi-agent system",
      "Human-in-the-loop approval via Telegram before any email ships",
      "Five source scrapers feeding a normalised lead model in SQLite",
      "Next.js 16 approval dashboard with Smartlead-webhook reply tracking",
    ],
    demo: {
      kind: "gallery",
      note: "Live pipeline data — lead identities blurred",
      images: [
        {
          src: "/work/sonar/01-queue.webp",
          alt: "Approval queue — scored leads with a drafted outreach email",
          caption: "Approval queue",
        },
        {
          src: "/work/sonar/02-analytics.webp",
          alt: "Analytics — 3,904 leads through the scrape-classify-draft pipeline",
          caption: "Pipeline analytics",
        },
        {
          src: "/work/sonar/03-history.webp",
          alt: "History — classified leads with intent scores",
          caption: "Lead history",
        },
      ],
    },
  },
  {
    slug: "fever",
    name: "fever",
    tagline: "AI content-viralization SaaS — score videos for break-out potential before they pop.",
    year: "2025",
    role: "Solo",
    accent: "oxblood",
    stack: [
      "TypeScript",
      "Next.js 16",
      "Prisma 7 + PostgreSQL",
      "Claude API (@anthropic-ai/sdk)",
      "NextAuth + Prisma adapter",
      "googleapis (YouTube)",
      "Recharts",
      "Tailwind v4",
    ],
    status: "In active build",
    visibility: "private",
    lede:
      "Claude-API virality scoring against algorithm-gate heuristics (hook, payoff, retention shape) — content scored for break-out before it pops, not after.",
    summary:
      "A SaaS for YouTube / Instagram / TikTok creators that scores content for virality and surfaces emerging trends. Uses the Claude API for content-DNA scoring against algorithm gates (hook, payoff, retention shape) and visualises portfolio-level momentum across channels. Pulls live YouTube data via googleapis. Next.js 16 dashboard with workspace + multi-channel support, NextAuth + Prisma adapter, and a Recharts-based analytics layer.",
    highlights: [
      "Claude-API virality scoring against algorithm-gate heuristics (hook, payoff, retention)",
      "Multi-platform: YouTube (live googleapis pull), Instagram, TikTok",
      "Workspace + multi-channel portfolio model on Prisma 7 + Postgres",
      "Trend-snapshot pipeline tracking emerging signals over time",
      "Next.js 16 + Tailwind v4 dashboard with Recharts analytics",
    ],
    demo: {
      kind: "gallery",
      images: [
        {
          src: "/work/fever/01-hero.webp",
          alt: "Fever landing hero — content virality scoring",
          caption: "Landing",
        },
        {
          src: "/work/fever/02-features.webp",
          alt: "Feature grid — content DNA, algorithm intelligence, virality prediction",
          caption: "Feature grid",
        },
        {
          src: "/work/fever/03-pricing.webp",
          alt: "Pricing — Free, Pro, Agency tiers",
          caption: "Pricing",
        },
      ],
    },
  },
  {
    slug: "hotship",
    name: "hotship",
    tagline: "Desktop shipping app for high-volume solo shippers — purpose-built UI over the Shippo API.",
    year: "2025–26",
    role: "Solo — desktop app",
    accent: "aubergine",
    stack: [
      "Tauri 2",
      "Rust",
      "React 19 + TypeScript",
      "Vite",
      "TanStack Query",
      "Radix UI + Tailwind v4",
      "Zustand",
      "Shippo API",
      "OS keychain (keyring)",
    ],
    status: "Pre-release · v0.1.5",
    visibility: "private",
    lede:
      "Tauri 2 + Rust instead of Electron — ~10× smaller binary, native silent print to the thermal printer, OS-keychain credentials. Every label purchase gated behind explicit user confirmation.",
    summary:
      "A native desktop shipping tool for the solo shipper who buys and prints 50+ labels a day and wants a purpose-built UI instead of Shippo's web dashboard. Tauri 2 + Rust client with a React 19 frontend. Paste an address → regex parse → verify via Shippo → rate-shop → buy → silent print to the default 4×6 thermal printer. Customs forms appear automatically for international destinations. API credentials live in the OS keychain, never in plaintext, and every billable label purchase is gated behind explicit user confirmation.",
    highlights: [
      "Tauri 2 + Rust client — fast, lean, offline-capable, ~10× smaller than Electron",
      "End-to-end flow: paste address → verify → rate-shop → buy → silent thermal print",
      "Searchable contacts + shipment history with 15-min tracking polling, void, and CSV export",
      "Auto-customs forms for non-US destinations",
      "Credentials stored in OS keychain via Rust `keyring` crate",
      "Explicit-confirmation guard on every label purchase — no auto-buy",
    ],
    demo: {
      kind: "gallery",
      note: "Desktop app UI — demo shipment data",
      images: [
        {
          src: "/work/hotship/01-dashboard.webp",
          alt: "Dashboard — in-flight shipments, spend, recent activity",
          caption: "Dashboard",
        },
        {
          src: "/work/hotship/03-new-shipment.webp",
          alt: "New shipment — paste address, verify, rate-shop, buy",
          caption: "Ship a package",
        },
        {
          src: "/work/hotship/02-history.webp",
          alt: "Shipment history — tracking, void, CSV export",
          caption: "Shipment history",
        },
      ],
    },
  },
  {
    slug: "juice",
    name: "juice",
    tagline: "NBA betting-intelligence SaaS — ML predictions, line shopping, bankroll tracking.",
    year: "2024–25",
    role: "Solo — full stack + ML",
    accent: "gold-leaf",
    stack: [
      "Python 3.12",
      "FastAPI",
      "SQLAlchemy (async) + PostgreSQL",
      "Redis + Celery",
      "XGBoost + LightGBM + scikit-learn",
      "nba_api",
      "Stripe",
      "React 19 + Vite + TypeScript",
    ],
    status: "In active build",
    visibility: "private",
    lede:
      "XGBoost + LightGBM + scikit-learn retrained on schedule via Celery + Redis. Multi-sportsbook odds aggregation for line shopping; bankroll tracking tied to live game state.",
    summary:
      "An NBA betting-intelligence SaaS. Backend is FastAPI + async SQLAlchemy on Postgres, with Celery workers running on Redis to ingest live game data via nba_api and to retrain prediction models (XGBoost + LightGBM) on a schedule. Surfaces line shopping across sportsbooks, bankroll + bet-history tracking, and live scores tied to open positions. React 19 + Vite frontend with TanStack Query and Recharts. Stripe-billed.",
    highlights: [
      "ML prediction stack — XGBoost + LightGBM + scikit-learn — retrained on schedule",
      "Async FastAPI + SQLAlchemy + Postgres backend; Celery + Redis for background workers",
      "Live NBA data via nba_api; multi-sportsbook odds aggregation for line shopping",
      "Bankroll + bet-history tracking with live scores tied to open positions",
      "Stripe-billed SaaS, JWT auth (python-jose + passlib)",
      "React 19 + Vite + TanStack Query + Recharts frontend",
    ],
    demo: {
      kind: "gallery",
      images: [
        {
          src: "/work/juice/01-picks.webp",
          alt: "Today's picks — model edges against sportsbook lines",
          caption: "Today's picks",
        },
        {
          src: "/work/juice/02-live.webp",
          alt: "Live tracker — today's games tied to open positions",
          caption: "Live tracker",
        },
        {
          src: "/work/juice/03-player-stats.webp",
          alt: "Player stats — recent-game log behind each pick",
          caption: "Player stats",
        },
      ],
    },
  },
];

/** Look up a project by slug, or `undefined` if there's no match. */
export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}

/**
 * The accent colour for a project's banner + decorative bits.
 *
 * Each project declares its accent explicitly on its entry (`Project.accent`)
 * so brand-meaningful pairings stay locked even if `PROJECTS` is reordered or
 * extended. Falls back to the first swatch if the slug isn't found or the
 * declared accent doesn't exist in `SWATCHES`.
 */
export function getProjectAccent(slug: string): Swatch {
  const project = PROJECTS.find((p) => p.slug === slug);
  const accentName = project?.accent ?? SWATCHES[0].name;
  return SWATCHES.find((s) => s.name === accentName) ?? SWATCHES[0];
}
