import { AnchorText } from "@clamly/anchor-react";
import Link from "next/link";
import { CodeBlock } from "../components/code-block";
import { Playground } from "../components/playground";

const FEATURES = [
  {
    title: "No changes to your page",
    body: "In browsers with the CSS Custom Highlight API, anchors are painted over the text. The DOM stays exactly as your site rendered it and nothing reflows."
  },
  {
    title: "Safe with React, Vue and Svelte",
    body: "Where highlights are unavailable, Anchor keeps every text node your framework owns in place, so updates, hydration and unmounting keep working."
  },
  {
    title: "Server-rendered when you want",
    body: "AnchorText components and the rehype plugin produce identical markup on the server and in every browser, so hydration never mismatches."
  },
  {
    title: "Built for many languages",
    body: "Saccade stop words in eight languages, splitting that keeps accents and Indic conjuncts whole, and scripts where anchors make no sense are left alone."
  },
  {
    title: "Neutral for screen readers",
    body: "Presentational bold only, never <strong>. Form fields, code, menus, widgets and live regions are skipped, and readers can opt out per section."
  },
  {
    title: "Small, with no dependencies",
    body: "About 4 KB gzipped for the text API and 10 KB for live anchoring, tree-shakable, with types for every module system."
  }
];

const SETUPS = [
  { href: "/docs/react", title: "React and Next.js", detail: "<AnchorText>, <Anchor> and useAnchor" },
  { href: "/docs/vue", title: "Vue and Nuxt", detail: "<AnchorText>, v-anchor and useAnchor" },
  { href: "/docs/svelte", title: "Svelte and SvelteKit", detail: "<AnchorText> and use:anchor" },
  { href: "/docs/markdown", title: "Markdown and MDX", detail: "A rehype plugin, no client JavaScript" },
  { href: "/docs/web-component", title: "Web component", detail: "<clamly-anchor> for any HTML" },
  { href: "/docs/script-tag", title: "One script tag", detail: "For sites without a build step" }
];

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Open source, by Clamly</p>
        <h1 id="hero-title">Reading anchors for any website.</h1>
        <p className="hero-lead" lang="en">
          <AnchorText>
            Clamly Anchor makes the start of each word bold, giving readers landmarks in dense text. Add it to any site or framework without
            breaking your pages or what screen readers announce.
          </AnchorText>
        </p>
        <div className="hero-actions">
          <Link className="button-primary" href="/docs">
            Get started
          </Link>
          <Link className="button-secondary" href="#playground">
            Try the playground
          </Link>
        </div>
        <CodeBlock title="Terminal" code="npm install @clamly/anchor" />
      </section>

      <section aria-labelledby="features-title" className="section">
        <h2 id="features-title" className="section-heading">
          Why Anchor
        </h2>
        <ul className="feature-grid">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="setups-title" className="section">
        <h2 id="setups-title" className="section-heading">
          Pick your setup
        </h2>
        <ul className="setup-grid">
          {SETUPS.map((setup) => (
            <li key={setup.href}>
              <Link href={setup.href}>
                <strong>{setup.title}</strong>
                <span>{setup.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Playground />

      <section aria-labelledby="evidence-title" className="section evidence">
        <h2 id="evidence-title" className="section-heading">
          What anchors can and cannot do
        </h2>
        <p>
          Many people find anchored text easier to scan, and readers with ADHD or dyslexia often ask for it. But anchors are a preference,
          not a treatment: a 2024 peer-reviewed study and a test with more than 2,000 readers both found no gain in reading speed. Anchor
          therefore never claims to make anyone read faster. Offer it as an option your readers can switch on, and let them{" "}
          <Link href="/self-test">measure what works for them</Link>.
        </p>
        <p>
          <Link href="/docs/accessibility">Read the accessibility notes and sources</Link>
        </p>
      </section>
    </>
  );
}
