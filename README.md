# Clamly Anchor

<p align="center">
  <img src="./apps/extension/public/icons/icon.svg" alt="" width="84" height="84" />
</p>

<p align="center">
  <strong>Reading anchors for any website: the start of each word in bold, without breaking your pages.</strong>
</p>

<p align="center">
  <a href="https://github.com/MrLamaker/clamly-anchor/actions/workflows/ci.yml"><img src="https://github.com/MrLamaker/clamly-anchor/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@clamly/anchor"><img src="https://img.shields.io/npm/v/@clamly/anchor.svg?style=flat-square" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT license"></a>
</p>

Clamly Anchor bolds the first part of each word to give readers visual landmarks in dense text. It works on any site and with
any framework, never changes what screen readers announce, and in current browsers draws anchors without touching your page's
DOM at all.

Anchors are a reading preference, not a treatment: published studies have not found that they make reading faster (see
[Accessibility and research](#accessibility-and-research)). Offer them as something readers can switch on.

## Packages

| Package | For | |
| --- | --- | --- |
| [`@clamly/anchor`](./packages/core) | Any page: live anchoring, text and HTML helpers, reader toggle, web component, script-tag builds | ~4 KB gzipped for text, ~10 KB live |
| [`@clamly/anchor-react`](./packages/react) | React 18/19 and Next.js: `<AnchorText>`, `<Anchor>`, `useAnchor` | |
| [`@clamly/anchor-vue`](./packages/vue) | Vue 3 and Nuxt: `<AnchorText>`, `v-anchor`, `useAnchor` | |
| [`@clamly/anchor-svelte`](./packages/svelte) | Svelte 5 and SvelteKit: `<AnchorText>`, `use:anchor` | |
| [`@clamly/rehype-anchor`](./packages/rehype) | Markdown and MDX at build time, no client JavaScript | |

This repository also contains the documentation site with a playground ([`apps/web`](./apps/web)) and a browser extension for
Chrome, Edge and Firefox ([`apps/extension`](./apps/extension)). Besides anchors, the extension offers other reading aids: a
readable font (Atkinson Hyperlegible Next, bundled, so nothing is downloaded), extra text spacing (the WCAG 1.4.12 values) and a
reading ruler.

## Quick start

```bash
npm install @clamly/anchor
```

```ts
import { createAnchor } from "@clamly/anchor";
import { createAnchorToggle } from "@clamly/anchor/toggle";

// Off until each reader switches it on; the choice is remembered.
const anchor = createAnchor(document.querySelector("main")!, { enabled: false, cadence: "saccade" });
createAnchorToggle({ controller: anchor });
```

No build step? One script tag adds the same toggle:

```html
<script src="https://cdn.jsdelivr.net/npm/@clamly/anchor@0.3/dist/anchor.auto.global.js" data-target="article" defer></script>
```

## How it works

- **No DOM changes where possible.** With the CSS Custom Highlight API, anchors are painted over the text: the DOM stays exactly as
  your site rendered it and nothing reflows.
- **Safe with frameworks everywhere else.** The DOM renderer never moves or replaces a text node your framework owns. It empties
  the node in place and adds a generated copy with the bold prefixes beside it; turning Anchor off puts the text back into the
  same node. The test suite runs real React 19, Vue 3 and Svelte 5 apps against it.
- **Deterministic text rules.** Words are found with Anchor's own Unicode rules, not the browser's segmenter, so server and browser
  produce identical markup and hydration never mismatches. Accents and Indic conjuncts are never split.
- **Languages.** Stop words for the `saccade` cadence in English, German, French, Spanish, Italian, Portuguese, Dutch and
  Romanian. Scripts written without spaces (Chinese, Japanese, Thai and others) are skipped by default, and markup output skips
  cursive scripts such as Arabic so their letters stay joined.
- **Stays out of the way.** Code, form fields, buttons, menus, navigation, widgets, live regions, editable areas, SVG, MathML,
  already-bold text and anything inside `data-anchor="off"` or `translate="no"` are left alone.
- **Built for real pages.** Content is anchored as it nears the viewport, in small chunks, and kept in sync as the page changes.

## Accessibility and research

Anchors only change how text looks. They use presentational `<b>` elements, never `<strong>`, and the accessibility tree is the same
before and after anchoring, which the browser tests check in Chromium, Firefox and WebKit.

There is no evidence that anchors increase reading speed: a 2024 peer-reviewed study ([Snell, Acta Psychologica](https://research.vu.nl/en/publications/no-bionic-reading-does-not-work/))
found no difference in reading times, and a [test with 2,074 readers](https://blog.readwise.io/bionic-reading-results/) found no
benefit. Some readers find anchored text more comfortable, which is a good reason to offer it, and a poor reason to switch it on for
everyone. The documentation site includes a self-test so readers can measure their own reading.

## Repository layout

```text
packages/
  core/      @clamly/anchor: engine, renderers, controller, toggle, web component, browser builds
  react/     @clamly/anchor-react
  vue/       @clamly/anchor-vue
  svelte/    @clamly/anchor-svelte
  rehype/    @clamly/rehype-anchor
apps/
  web/       documentation site and playground (Next.js)
  extension/ browser extension (Manifest V3)
e2e/         browser tests (Playwright): frameworks, accessibility, scripts, performance, the extension, the docs site and
             approved screenshots
```

## Development

Requires Node.js 24 and pnpm 12.

```bash
pnpm install
pnpm test          # unit tests in every package
pnpm typecheck
pnpm lint          # Biome
pnpm build
pnpm test:e2e      # browser tests, after `pnpm build` (install browsers once:
                   # pnpm --filter @clamly/anchor-e2e exec playwright install --with-deps)
pnpm dev:web       # documentation site at http://localhost:3000
pnpm build:extension
```

Changes to published packages need a changeset: run `pnpm changeset` and describe the change for users. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the design rules every change must keep.

## Security and license

Report vulnerabilities privately as described in [SECURITY.md](./SECURITY.md). Clamly Anchor is released under the
[MIT license](./LICENSE).
