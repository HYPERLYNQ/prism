/**
 * Bottom-left blurb on the home page — the plain-language pitch that lives
 * alongside the WebGL hero. Server component (pure markup); previously
 * lived inside HeroOverlay.
 */
export default function HomeBlurb() {
  return (
    <div className="home-blurb">
      <p>
        <b>Builds applied AI end-to-end</b> — outreach pipelines, persistent memory for Claude
        Code, virality intelligence, shipping desktops. Solo, production-grade.
      </p>
    </div>
  );
}
