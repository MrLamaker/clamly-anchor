import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "Markdown and MDX" };

export default function MarkdownDocs() {
  return (
    <>
      <h1>Markdown and MDX</h1>
      <p>
        <code>@clamly/rehype-anchor</code> adds anchors when your site is built, for blogs, documentation and anything else that goes
        through unified (remark and rehype). The result is plain HTML: no JavaScript runs in the browser.
      </p>
      <CodeBlock title="Terminal" code="npm install @clamly/rehype-anchor @clamly/anchor" />

      <h2>unified</h2>
      <CodeBlock
        title="build.ts"
        code={`import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeAnchor from "@clamly/rehype-anchor";

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeAnchor, { cadence: "saccade" })
  .use(rehypeStringify)
  .process(markdown);`}
      />

      <h2>Next.js with @next/mdx</h2>
      <CodeBlock
        title="next.config.mjs"
        code={`import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    // Plugin names as strings work with Turbopack.
    rehypePlugins: [["@clamly/rehype-anchor", { cadence: "saccade" }]]
  }
});

export default withMDX({ pageExtensions: ["ts", "tsx", "md", "mdx"] });`}
      />

      <h2>Astro</h2>
      <CodeBlock
        title="astro.config.mjs"
        code={`import { defineConfig } from "astro/config";
import rehypeAnchor from "@clamly/rehype-anchor";

export default defineConfig({
  markdown: { rehypePlugins: [[rehypeAnchor, { cadence: "saccade" }]] }
});`}
      />

      <h2>Let readers switch it off</h2>
      <p>
        Pre-rendered anchors follow the <code>data-anchor</code> attribute: with the Anchor stylesheet,{" "}
        <code>data-anchor=&quot;off&quot;</code> on any ancestor shows the text without them. To start with anchors off, render{" "}
        <code>&lt;html data-anchor=&quot;off&quot;&gt;</code> and add the toggle, which switches the attribute and remembers the choice:
      </p>
      <CodeBlock
        title="main.ts"
        code={`import "@clamly/anchor/styles.css";
import { createAnchorToggle } from "@clamly/anchor/toggle";

createAnchorToggle(); // without a controller it switches <html data-anchor>`}
      />

      <h2>What the plugin skips</h2>
      <p>
        Code, headings and other bold text, form controls, navigation, SVG, MathML, elements with <code>data-anchor=&quot;off&quot;</code>{" "}
        or <code>translate=&quot;no&quot;</code>, and paragraphs that already contain anchors, so running it twice changes nothing. MDX
        components are anchored unless they carry <code>data-anchor=&quot;off&quot;</code>. Options: every text option, plus{" "}
        <code>skipTags</code>, <code>skipRoles</code> and <code>skipBoldText</code>.
      </p>
    </>
  );
}
