import Hero from "@/components/Hero";
import { personSchema } from "@/lib/jsonLd";

/**
 * Home route — renders the WebGL `Hero` and emits the site's `Person`
 * JSON-LD structured data so search engines can build a knowledge-card-style
 * result for "Mike Vidal AI Engineer".
 */
export default function Home() {
  const schema = personSchema();
  return (
    <>
      {/*
        Structured data — JSON-LD for the site owner (Person).
        Content is JSON.stringify'd from typed constants with no user input
        anywhere in the chain, so there's no XSS surface.
      */}
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <Hero />
    </>
  );
}
