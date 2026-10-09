import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "Styling" };

export default function StylingDocs() {
  return (
    <>
      <h1>Styling</h1>
      <p>Anchor&apos;s stylesheet is short and every value can be changed with a CSS custom property.</p>

      <h2>Bold prefixes</h2>
      <p>
        Used by the DOM renderer, <code>processText</code>, the framework components and the rehype plugin:
      </p>
      <CodeBlock
        title="styles.css"
        code={`:root {
  --clamly-anchor-weight: 650;      /* default 700 */
  --clamly-anchor-color: #1f2440;   /* default: the text's own colour */
}`}
      />

      <h2>Highlights</h2>
      <p>
        The CSS Custom Highlight API cannot change font weight, so the highlight renderer draws a thin shadow in the text&apos;s own colour.
        It looks close to bold and never changes where lines break.
      </p>
      <CodeBlock
        title="styles.css"
        code={`:root {
  --clamly-anchor-shadow: 0.06em 0 0 currentColor; /* default 0.05em */
}

/* Or style the highlight yourself: */
::highlight(clamly-anchor) {
  text-shadow: none;
  color: #3b4fd8;
}`}
      />

      <h2>Switching pre-rendered anchors off</h2>
      <p>
        With the stylesheet loaded, <code>data-anchor=&quot;off&quot;</code> on any ancestor shows text without its anchors. The toggle sets
        it on <code>&lt;html&gt;</code> when it has no live controller.
      </p>

      <h2>Strict Content Security Policy</h2>
      <p>
        Anchor adds its stylesheet with a constructed stylesheet where possible, which CSP rules for inline styles do not block. If you
        prefer to ship the CSS yourself, pass <code>styles: false</code> and import the file:
      </p>
      <CodeBlock
        title="main.ts"
        code={`import "@clamly/anchor/styles.css";
import { createAnchor } from "@clamly/anchor";

createAnchor(document, { styles: false });`}
      />

      <h2>The reader toggle</h2>
      <CodeBlock
        title="styles.css"
        code={`:root {
  --clamly-anchor-toggle-background: #ffffff;
  --clamly-anchor-toggle-color: #1f2440;
  --clamly-anchor-toggle-border: #4a5cc0;
  --clamly-anchor-toggle-active-background: #4a5cc0;
  --clamly-anchor-toggle-active-color: #ffffff;
  --clamly-anchor-toggle-focus: #8da2fb;
}`}
      />
      <p>
        Pass <code>unstyled: true</code> to <code>createAnchorToggle</code> to style the <code>.clamly-anchor-toggle</code> button entirely
        yourself, or <code>container</code> to place it inside your own layout instead of floating.
      </p>
    </>
  );
}
