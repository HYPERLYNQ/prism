import { OWNER_EMAIL, OWNER_GITHUB } from "@/lib/siteConfig";

/**
 * Bottom-right contact block on the home page — quick, direct ways to reach out
 * (email + GitHub), framing the hero opposite the value-prop blurb. Replaces the
 * previous shipped-work credentials block: the Work dropdown and /work index now
 * carry that proof, so the corner is better spent on an easy contact path.
 *
 * Server component. Keeps the `.home-cred*` positioning + row classes so the
 * responsive bottom-band cascade (blurb left / picker centre / this right,
 * rotating to a left stack under 1280px) is unchanged.
 */
export default function HomeContact() {
  return (
    <div className="home-cred">
      <a
        className="home-cred-row"
        href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent("Re: mikevidal.dev — let's talk")}`}
      >
        <span className="home-cred-name">email</span>
        <span className="home-cred-sep" aria-hidden="true">·</span>
        <span className="home-cred-venue">{OWNER_EMAIL}</span>
        <span className="home-cred-arr" aria-hidden="true">→</span>
      </a>
      <a
        className="home-cred-row"
        href={OWNER_GITHUB}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="home-cred-name">github</span>
        <span className="home-cred-sep" aria-hidden="true">·</span>
        <span className="home-cred-venue">github.com/HYPERLYNQ</span>
        <span className="home-cred-arr" aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
