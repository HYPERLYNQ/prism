import Link from "next/link";

/**
 * Bottom-right credential block on the home page — the recruiter-conversion
 * proof points (shipped work + in-flight). Previously top-right under the
 * status badge; moved to bottom-right with the tabbed-masthead refactor so
 * the masthead can absorb the status, and the bottom corners frame the
 * hero with blurb (left) + credentials (right).
 *
 * Server component. The two link rows go to the real external listings the
 * `↗` arrow implies (canonical URLs in `lib/projects.ts`); the trailing
 * `see all →` is an internal link.
 */
export default function HomeCredentials() {
  return (
    <div className="home-cred">
      <a
        className="home-cred-row"
        href="https://apps.shopify.com/wholesale-harmony"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="home-cred-name">wholesale-harmony</span>
        <span className="home-cred-sep" aria-hidden="true">·</span>
        <span className="home-cred-venue">shopify app store</span>
        <span className="home-cred-arr" aria-hidden="true">↗</span>
      </a>
      <a
        className="home-cred-row"
        href="https://www.npmjs.com/package/@hyperlynq/synaptic"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="home-cred-name">synaptic</span>
        <span className="home-cred-sep" aria-hidden="true">·</span>
        <span className="home-cred-venue">
          npm <span className="home-cred-ver">v1.7.6</span>
        </span>
        <span className="home-cred-arr" aria-hidden="true">↗</span>
      </a>
      <Link className="home-cred-more" href="/work">
        + 4 in active build <span className="home-cred-sep" aria-hidden="true">·</span> see all{" "}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
