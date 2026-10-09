import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "React" };

export default function ReactDocs() {
  return (
    <>
      <h1>React and Next.js</h1>
      <CodeBlock title="Terminal" code="npm install @clamly/anchor-react" />
      <p>Works with React 18 and 19, including Server Components and streaming.</p>

      <h2>Anchored text, rendered anywhere</h2>
      <p>
        <code>&lt;AnchorText&gt;</code> renders plain React elements. It uses no hooks, so it works in Server Components, and its output is
        the same on the server and in the browser.
      </p>
      <CodeBlock
        title="Article.tsx"
        code={`import { AnchorText } from "@clamly/anchor-react";

export function Article({ body }: { body: string }) {
  return (
    <p>
      <AnchorText cadence="saccade">{body}</AnchorText>
    </p>
  );
}`}
      />

      <h2>Anchor everything inside an element</h2>
      <p>
        <code>&lt;Anchor&gt;</code> anchors whatever renders inside it, including content that changes later. Anchor options are props;
        other props go to the element.
      </p>
      <CodeBlock
        title="Reader.tsx"
        code={`"use client";
import { Anchor } from "@clamly/anchor-react";

export function Reader({ children }: { children: React.ReactNode }) {
  return (
    <Anchor as="article" cadence="saccade" className="reader">
      {children}
    </Anchor>
  );
}`}
      />

      <h2>The hook</h2>
      <p>
        <code>useAnchor</code> anchors an element you already have a ref to and returns the controller, for example to build your own
        toggle:
      </p>
      <CodeBlock
        title="Post.tsx"
        code={`"use client";
import { useRef } from "react";
import { useAnchor } from "@clamly/anchor-react";

export function Post({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const anchor = useAnchor(ref, { fixationStrength: 50, enabled: false });
  return (
    <>
      <button type="button" onClick={() => anchor?.toggle()}>
        Reading anchors
      </button>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}`}
      />

      <h2>Why it is safe with React</h2>
      <p>
        React keeps references to the text nodes it renders. Anchor never replaces or moves them: with highlights it does not touch the DOM
        at all, and with the DOM renderer it leaves React&apos;s nodes in place and adds its own markup beside them. The test suite runs
        real React 19 apps that update, reorder and remove anchored text.
      </p>

      <h2>Styles</h2>
      <p>
        Live anchoring adds its stylesheet automatically. For <code>&lt;AnchorText&gt;</code> markup, import the stylesheet once, for
        example in your root layout, to get the same weight and the <code>data-anchor=&quot;off&quot;</code> switch:
      </p>
      <CodeBlock title="app/layout.tsx" code={`import "@clamly/anchor/styles.css";`} />
    </>
  );
}
