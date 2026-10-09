import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "../../components/code-block";

export const metadata: Metadata = { title: "Getting started" };

export default function GettingStarted() {
  return (
    <>
      <h1>Getting started</h1>
      <p>
        Clamly Anchor bolds the start of each word to give readers visual landmarks. The core package works in any browser page; small
        packages add components for React, Vue and Svelte, a rehype plugin for Markdown, a web component and a one-line script.
      </p>

      <h2>Install</h2>
      <CodeBlock title="Terminal" code="npm install @clamly/anchor" />
      <p>
        Prefer no build step? Use the <Link href="/docs/script-tag">script tag</Link>.
      </p>

      <h2>Anchor part of a page</h2>
      <CodeBlock
        title="main.ts"
        code={`import { createAnchor } from "@clamly/anchor";

const anchor = createAnchor(document.querySelector("article")!, {
  cadence: "saccade" // leave words like "the" and "of" unanchored
});

anchor.update({ fixationStrength: 55 }); // change options at any time
anchor.disable(); // remove every anchor and restore the page exactly
anchor.enable();
anchor.destroy(); // stop observing the page for good`}
      />
      <p>
        <code>createAnchor</code> keeps anchors in sync when the page changes, anchors content as it nears the viewport, and works in small
        chunks so long pages stay responsive.
      </p>

      <h2>How anchors are drawn</h2>
      <p>
        The <code>renderer</code> option chooses how anchors appear:
      </p>
      <ul>
        <li>
          <code>&quot;auto&quot;</code> (default) uses highlights where the browser supports them and falls back to the DOM renderer.
        </li>
        <li>
          <code>&quot;highlight&quot;</code> uses the CSS Custom Highlight API. Your DOM is never changed and text never reflows. Browsers
          without support show no anchors.
        </li>
        <li>
          <code>&quot;dom&quot;</code> draws real bold text. Each of your text nodes stays where it is (emptied) and a generated copy with
          the bold prefixes is placed after it, so frameworks keep working. Turning Anchor off puts the text back into the same nodes.
        </li>
      </ul>

      <h2>Let readers choose</h2>
      <p>Anchors suit some readers and not others. The toggle adds an accessible on/off button that remembers each reader&apos;s choice:</p>
      <CodeBlock
        title="main.ts"
        code={`import { createAnchor } from "@clamly/anchor";
import { createAnchorToggle } from "@clamly/anchor/toggle";

const anchor = createAnchor(document.querySelector("main")!, { enabled: false });
createAnchorToggle({ controller: anchor }); // off until the reader turns it on`}
      />

      <h2>Keep Anchor out of something</h2>
      <p>
        Add <code>data-anchor=&quot;off&quot;</code> to any element. Anchor already skips code, form fields, buttons, menus, navigation,
        widgets, live regions, editable areas, SVG, MathML and elements with <code>translate=&quot;no&quot;</code>. You can also pass{" "}
        <code>skipSelector</code>, <code>skipTags</code> or <code>skipRoles</code>.
      </p>
      <CodeBlock title="index.html" code={`<p data-anchor="off">Prices, brand names, anything else you want untouched.</p>`} />

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/docs/react">React</Link>, <Link href="/docs/vue">Vue</Link> or <Link href="/docs/svelte">Svelte</Link> components
        </li>
        <li>
          <Link href="/docs/markdown">Markdown and MDX</Link> at build time
        </li>
        <li>
          Every option in the <Link href="/docs/api">API reference</Link>
        </li>
      </ul>
    </>
  );
}
