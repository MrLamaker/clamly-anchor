# @clamly/rehype-anchor

A [rehype](https://github.com/rehypejs/rehype) plugin that adds [Clamly Anchor](https://github.com/MrLamaker/clamly-anchor) reading
anchors to HTML at build time: Markdown, MDX, and anything else that goes through unified. The output is plain markup; no
JavaScript runs in the browser.

```bash
npm install @clamly/rehype-anchor @clamly/anchor
```

## unified

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeAnchor from "@clamly/rehype-anchor";

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeAnchor, { cadence: "saccade" })
  .use(rehypeStringify)
  .process(markdown);
```

## Next.js (`@next/mdx`)

```js
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: { rehypePlugins: [["@clamly/rehype-anchor", { cadence: "saccade" }]] }
});

export default withMDX({ pageExtensions: ["ts", "tsx", "md", "mdx"] });
```

## Astro

```js
import { defineConfig } from "astro/config";
import rehypeAnchor from "@clamly/rehype-anchor";

export default defineConfig({ markdown: { rehypePlugins: [[rehypeAnchor, { cadence: "saccade" }]] } });
```

## Let readers switch anchors off

With `@clamly/anchor/styles.css` loaded, `data-anchor="off"` on any ancestor shows the text without anchors. Render
`<html data-anchor="off">` to start with them off, and add the toggle, which switches the attribute and remembers the choice:

```ts
import "@clamly/anchor/styles.css";
import { createAnchorToggle } from "@clamly/anchor/toggle";

createAnchorToggle();
```

## Options

Every text option of [`@clamly/anchor`](../core) (`fixationStrength`, `cadence`, `locale`, `stopWords`, `skipWords`,
`minimumWordLength`, `anchorNumbers`, `skipScripts`, `shouldAnchorWord`), plus:

- `skipTags`, `skipRoles`: more elements to leave alone.
- `skipBoldText` (default `true`): leave headings, `<b>`, `<strong>` and `<th>` alone.

The plugin also leaves code, form controls, navigation, SVG, MathML, `data-anchor="off"`, `translate="no"` and paragraphs that
already contain anchors alone, so running it twice changes nothing. `lang` attributes choose the stop words for each element. MDX
components are anchored unless they carry `data-anchor="off"`.

## License

MIT © [Clamly](https://clamly.app)
