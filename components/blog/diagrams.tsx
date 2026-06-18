import type { ReactNode } from "react";

/**
 * Brutalist mono schematics embedded in blog posts — monochrome boxes + arrows
 * that match the site's terminal aesthetic and adapt to light/dark via the ink
 * tokens. Styling lives in `.bd-*` (globals.css); each export is a complete
 * <figure> a post imports and drops inline.
 */

function Fig({ n, label, children }: { n: string; label: string; children: ReactNode }) {
  return (
    <figure className="bd">
      <div className="bd-stage">{children}</div>
      <figcaption className="bd-cap">
        <span className="bd-cap-num">FIG.{n}</span>
        <span>{label}</span>
      </figcaption>
    </figure>
  );
}

function Node({ k, v, keyNode }: { k?: string; v: string; keyNode?: boolean }) {
  return (
    <div className={`bd-node${keyNode ? " is-key" : ""}`}>
      {k ? <span className="bd-node-k">{k}</span> : null}
      <span className="bd-node-v">{v}</span>
    </div>
  );
}

function Arrow() {
  return (
    <span className="bd-arrow" aria-hidden="true">
      →
    </span>
  );
}

/** persistent-memory-for-ai-coding-agents */
export function MemoryLifecycle() {
  return (
    <Fig n="01" label="Memory lifecycle — captured once, recalled every session">
      <div className="bd-flow">
        <Node k="Session N" v="decisions · corrections · facts" />
        <Arrow />
        <Node k="Capture" v="structured records → disk" />
        <Arrow />
        <Node k="Store" v="hybrid index, on-device" keyNode />
        <Arrow />
        <Node k="Recall" v="relevant records at startup" />
        <Arrow />
        <Node k="Session N+1" v="context restored" />
      </div>
    </Fig>
  );
}

/** local-rag-sqlite-vec-transformers-js-mcp */
export function HybridRetrieval() {
  return (
    <Fig n="01" label="Hybrid retrieval — keyword + semantic, merged & ranked">
      <div className="bd-flow">
        <Node k="Query" v="what's relevant?" />
        <Arrow />
        <div className="bd-col">
          <Node k="Lexical" v="BM25 keyword" />
          <Node k="Semantic" v="sqlite-vec + Transformers.js" />
        </div>
        <Arrow />
        <Node k="Fuse" v="score · merge · rank" keyNode />
        <Arrow />
        <Node k="Top-k" v="context, fully local" />
      </div>
    </Fig>
  );
}

/** most-multi-agent-systems-arent-multi-agent */
export function PipelineVsAgents() {
  return (
    <Fig n="01" label="Multi-stage pipeline (what I ship) ≠ multi-agent">
      <div className="bd-flow">
        <div className="bd-col">
          <span className="bd-head">Multi-stage pipeline · 1 model + HITL</span>
          <Node v="scrape" />
          <Arrow />
          <Node v="classify (tool-use)" />
          <Arrow />
          <Node v="draft" />
          <Arrow />
          <Node v="human approves" keyNode />
          <Arrow />
          <Node v="send" />
        </div>
        <span className="bd-arrow" aria-hidden="true">
          ≠
        </span>
        <div className="bd-col">
          <span className="bd-head">True multi-agent · not this</span>
          <Node v="supervisor agent" />
          <Node k="coordinate" v="agent ⇄ agent" />
          <Node k="coordinate" v="agent ⇄ agent" />
          <Node v="emergent control flow" />
        </div>
      </div>
    </Fig>
  );
}

/** raw-three-js-not-react-three-fiber */
export function RenderLoop() {
  return (
    <Fig n="01" label="Per-frame loop — imperative, no React in the hot path">
      <div className="bd-flow">
        <Node k="rAF tick" v="every frame" />
        <Arrow />
        <Node k="Update" v="camera parallax · physics" />
        <Arrow />
        <Node k="Compose" v="scene → passes → bloom" keyNode />
        <Arrow />
        <Node k="Canvas" v="one draw to screen" />
      </div>
    </Fig>
  );
}

/** shopify-wholesale-approval-workflow */
export function ApprovalWorkflow() {
  return (
    <Fig n="01" label="B2B approval — gated server-side, not in the theme">
      <div className="bd-flow">
        <Node k="Customer" v="registers · license, tax ID" />
        <Arrow />
        <Node k="Queue" v="pending review" />
        <Arrow />
        <Node k="Merchant" v="approve / reject" />
        <Arrow />
        <Node k="Shopify Functions" v="enforce at checkout" keyNode />
      </div>
    </Fig>
  );
}
