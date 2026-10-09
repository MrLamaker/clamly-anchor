import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "Web component" };

const ATTRIBUTES: Array<[string, string]> = [
  ["strength", "Share of each word made bold, 0 to 100. Default 45."],
  ["cadence", "all, alternating or saccade. Default all."],
  ["renderer", "auto, highlight or dom. Default auto."],
  ["locale", "Language for saccade stop words, such as de. Defaults to the nearest lang attribute."],
  ["skip-selector", "CSS selector for content to leave alone."],
  ["disabled", "Present: anchors are removed until the attribute is removed."]
];

export default function WebComponentDocs() {
  return (
    <>
      <h1>Web component</h1>
      <p>
        <code>&lt;clamly-anchor&gt;</code> anchors everything inside it. It works in plain HTML, CMS templates and any framework that
        renders custom elements.
      </p>

      <h2>With a bundler</h2>
      <CodeBlock title="main.ts" code={`import "@clamly/anchor/element"; // registers <clamly-anchor>`} />

      <h2>Without one</h2>
      <CodeBlock
        title="index.html"
        code={`<script src="https://cdn.jsdelivr.net/npm/@clamly/anchor@0.3/dist/anchor.global.js" defer></script>`}
      />

      <h2>Use it</h2>
      <CodeBlock
        title="index.html"
        code={`<clamly-anchor cadence="saccade" strength="50">
  <article>
    <h1>Long read</h1>
    <p>Everything in here gets reading anchors.</p>
  </article>
</clamly-anchor>`}
      />
      <p>
        Invalid attribute values are ignored instead of throwing, so a typo never breaks the page. The element&apos;s{" "}
        <code>controller</code> property gives scripts the full controller API.
      </p>

      <h2>Attributes</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Attribute</th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map(([name, meaning]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
