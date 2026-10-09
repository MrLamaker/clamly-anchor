# @clamly/anchor

Reading anchors for any website: the start of each word in bold, drawn without breaking your pages or what screen readers
announce. Zero dependencies, tree-shakable, with types for ES modules and CommonJS.

```bash
npm install @clamly/anchor
```

## Anchor a live page

```ts
import { createAnchor } from "@clamly/anchor";

const anchor = createAnchor(document.querySelector("article")!, { cadence: "saccade" });

anchor.update({ fixationStrength: 55 }); // change options at any time
anchor.disable(); // remove every anchor and restore the page exactly
anchor.enable();
anchor.destroy(); // stop for good
```

`createAnchor` accepts an element or a `document`. It keeps anchors in sync as the page changes, anchors content as it nears the
viewport, works in small chunks, and anchors everything before printing.

### Renderers

| `renderer` | What it does |
| --- | --- |
| `"auto"` (default) | `"highlight"` where supported, otherwise `"dom"` |
| `"highlight"` | CSS Custom Highlight API: the DOM is never changed and text never reflows. Unsupported browsers show nothing. |
| `"dom"` | Real bold. Each text node stays in place (emptied) with a generated copy beside it, so React, Vue and Svelte keep working; `disable()` puts the text back into the same nodes. |

## Let readers choose

```ts
import { createAnchor } from "@clamly/anchor";
import { createAnchorToggle } from "@clamly/anchor/toggle";

const anchor = createAnchor(document.querySelector("main")!, { enabled: false });
createAnchorToggle({ controller: anchor }); // accessible button, remembers the choice, syncs open tabs
```

Options: `container` (place the button yourself), `defaultEnabled`, `storageKey` (`null` to not remember), `label`, `unstyled`,
`onChange`. Without a `controller` the toggle switches `data-anchor` on `<html>`, which shows or hides pre-rendered anchors.

## Text and markup

These give identical results on every server and browser:

```ts
import { getAnchorSpans, getWordParts, processText, splitText } from "@clamly/anchor";

splitText("Reading dense text"); // [{ value: "Rea", bold: true }, { value: "ding ", bold: false }, ...]
processText("Fast & safe"); // escaped HTML with <b class="clamly-anchor-bold" data-clamly-anchor="fixation">
getWordParts("reader"); // { prefix: "rea", suffix: "der" }
getAnchorSpans("Reading"); // [{ start: 0, end: 3 }] UTF-16 offsets, for custom renderers
```

One-shot DOM anchoring for static content: `processElement(element, options)` and `restoreElement(element)`.

## Options

| Option | Default | |
| --- | --- | --- |
| `fixationStrength` | `45` | Share of each word made bold, 0–100. Words of up to three characters use one. |
| `minimumWordLength` | `1` | Shorter words stay unanchored (user-perceived characters). |
| `cadence` | `"all"` | `"all"`, `"alternating"` (every other word per paragraph) or `"saccade"` (skip function words). |
| `locale` | nearest `lang` | Picks saccade stop words (en, de, fr, es, it, pt, nl, ro) and case rules. |
| `stopWords`, `skipWords` | | Replace the stop words; words to never anchor. |
| `shouldAnchorWord` | | `(context) => boolean` for your own rule. |
| `anchorNumbers` | `false` | Anchor tokens with digits. |
| `skipScripts` | see below | Unicode scripts to leave alone. |
| `renderer`, `observe`, `lazy`, `enabled`, `styles` | `"auto"`, `true`, `true`, `true`, `true` | Live pages only. |
| `skipSelector`, `skipTags`, `skipRoles`, `skipBoldText` | | DOM only: what to leave alone. `skipBoldText` defaults to `true`. |
| `signal` | | An `AbortSignal` that destroys the controller. |

Invalid options throw a `TypeError` naming every problem. `skipScripts` defaults to scripts without spaces between words (Han,
Hiragana, Katakana, Thai, Lao, Khmer, Myanmar and others) plus, for markup, cursive scripts (Arabic, Syriac and others) whose letters
must stay joined. The highlight renderer never splits words, so it anchors cursive scripts too.

Always skipped: code, form fields, buttons, menus and navigation, widgets by ARIA role, live regions, editable areas, SVG, MathML,
elements with `data-anchor="off"` or `translate="no"`, and paragraphs that already contain pre-rendered anchors.

## Styling

```css
:root {
  --clamly-anchor-weight: 700; /* bold prefixes */
  --clamly-anchor-color: inherit;
  --clamly-anchor-shadow: 0.05em 0 0 currentColor; /* highlight renderer */
}
```

The stylesheet is added automatically, as a constructed stylesheet that a Content-Security-Policy cannot block (browsers without
constructed stylesheets get a `<style>` element). To ship the CSS with your own instead, pass `styles: false` and import
`@clamly/anchor/styles.css`. Next.js 16.3 and earlier warn that `::highlight` is not a valid pseudo-element when they bundle that
file: the warning is harmless, the rule is kept, and Next.js 16.4 no longer shows it.

## More entry points

- `@clamly/anchor/element`: registers `<clamly-anchor>`, which anchors its content (attributes: `strength`, `cadence`, `renderer`,
  `locale`, `skip-selector`, `disabled`).
- `dist/anchor.auto.global.js`: one script tag with a reader toggle (`data-target`, `data-cadence`, …).
- `dist/anchor.global.js`: the whole API as `window.ClamlyAnchor`.
- `calculateReadingMetrics(text, { wordsPerMinute })`: word count, anchored words and an estimated reading time at an average rate
  (238 words per minute by default). Anchoring is not assumed to change reading speed.

Framework packages: [`@clamly/anchor-react`](../react), [`@clamly/anchor-vue`](../vue), [`@clamly/anchor-svelte`](../svelte),
[`@clamly/rehype-anchor`](../rehype).

## Browser support

Any browser with ES2022. The highlight renderer needs the CSS Custom Highlight API (current Chrome, Edge, Safari and Firefox);
elsewhere `"auto"` uses the DOM renderer. Lazy anchoring uses `IntersectionObserver` when available.

## License

MIT © [Clamly](https://clamly.app)
