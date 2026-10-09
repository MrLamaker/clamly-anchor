# Contributing to Clamly Anchor

Thank you for helping! Contributions from developers, designers, accessibility specialists and readers who rely on tools like this
are all welcome. Please also read the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Repository

| Path | Package | What lives there |
| --- | --- | --- |
| `packages/core` | `@clamly/anchor` | Text engine, DOM renderers, `createAnchor`, toggle, web component, browser builds |
| `packages/react` | `@clamly/anchor-react` | `<AnchorText>`, `<Anchor>`, `useAnchor` |
| `packages/vue` | `@clamly/anchor-vue` | `<AnchorText>`, `v-anchor`, `useAnchor` |
| `packages/svelte` | `@clamly/anchor-svelte` | `<AnchorText>`, `use:anchor` |
| `packages/rehype` | `@clamly/rehype-anchor` | Build-time plugin for Markdown and MDX |
| `apps/web` | | Documentation site, playground and reading self-test |
| `apps/extension` | | Browser extension for Chrome, Edge and Firefox |
| `e2e` | | Playwright tests in Chromium, Firefox and WebKit |

## Setup

Requires Node.js 24 and pnpm 12.

```bash
git clone https://github.com/MrLamaker/clamly-anchor.git
cd clamly-anchor
pnpm install
pnpm --filter @clamly/anchor-e2e exec playwright install --with-deps   # once, for the browser tests
```

| Command | |
| --- | --- |
| `pnpm test` | Unit tests in every package and app (Vitest, with jsdom and real React, Vue and Svelte) |
| `pnpm test:e2e` | Browser tests: frameworks, accessibility, scripts, performance, the extension and the documentation site |
| `pnpm typecheck` | TypeScript, including the tests |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm build` | Every package and app |
| `pnpm check:size` | Bundle-size limits |
| `pnpm dev:web` | Documentation site at http://localhost:3000 |
| `pnpm build:extension` | Chrome/Edge build in `apps/extension/dist`, Firefox build in `apps/extension/dist-firefox` |

To try the extension in Chrome or Edge, open `chrome://extensions` (or `edge://extensions`), turn on Developer mode, choose
**Load unpacked** and select `apps/extension/dist`. In Firefox, open `about:debugging`, choose **This Firefox**, then **Load
Temporary Add-on** and select `apps/extension/dist-firefox/manifest.json`. Run `npx web-ext lint --source-dir
apps/extension/dist-firefox` to check the Firefox build the way addons.mozilla.org does.

The extension's keyboard shortcut is Ctrl+Shift+Y (Command+Shift+Y on macOS) in Chrome and Alt+Shift+A in Firefox, because
Ctrl+Shift+A belongs to the browsers themselves. Browsers do not assign a suggested shortcut that clashes with one of theirs
(Edge uses Ctrl+Shift+Y for Collections), so users can always set their own at `chrome://extensions/shortcuts`, and the popup
shows the shortcut that is actually assigned.

## Browser tests

Browser tests need everything built first (`pnpm build`); `pnpm test:e2e` then runs them in Chromium, Firefox and WebKit. The
extension is installed in Chromium through the DevTools protocol and in Firefox as a temporary add-on, and the documentation site
is tested as built for production. Where Microsoft Edge is installed, the extension tests also run in Edge (`--project=edge`); CI
runs them on GitHub's Ubuntu runners, which come with Edge.

Approved screenshots (`e2e/tests/visual.spec.ts`) catch changes in how anchors look in Latin, Devanagari, Arabic, Japanese and
Thai text. Text rendering differs between operating systems, so they are compared only in Playwright's Docker image, which CI uses;
elsewhere those tests are skipped. When a screenshot changes, or a visual test is new, CI fails and uploads the screenshots it
rendered as `proposed-screenshots-<browser>` artifacts. Compare them in the `playwright-report-<browser>` artifact; if the change
is intended, download them over the approved ones, commit them, and review the images in the pull request like any other change:

```bash
for browser in chromium firefox webkit; do
  gh run download <run-id> --name "proposed-screenshots-$browser" --dir e2e/tests/__screenshots__
done
```

To upgrade Playwright, change `@playwright/test` in `e2e/package.json` and the `mcr.microsoft.com/playwright` image in
`.github/workflows/ci.yml` together, then commit the screenshots CI proposes. Dependabot leaves Playwright alone for this reason.

## Rules every change must keep

1. **Never move, replace or merge a text node the page owns.** Frameworks hold references to their nodes. The DOM renderer
   empties a node in place and puts its generated copy beside it; restoring writes the text back into the same node. Never call
   `normalize()` on page content.
2. **Never use `<strong>`.** Screen readers announce it as emphasis. Anchors are presentational `<b>` elements (or highlights) and
   the accessible text of a page must not change. The e2e suite compares accessibility trees.
3. **Skip what is not reading text:** code, form fields, buttons, menus, navigation, widgets by ARIA role, live regions, editable
   areas, SVG, MathML, `data-anchor="off"` and `translate="no"`.
4. **Keep text rules deterministic.** Server and browser must produce identical output, so word splitting may not depend on
   `Intl.Segmenter` or the runtime's locale. Never split a grapheme cluster or an Indic conjunct.
5. **Do nothing while disabled.** A disabled controller, or the extension while Anchor is off, must not touch the page at all.
6. **No unsupported claims.** Do not describe anchors as making reading faster or as a treatment for any condition. Metrics are
   descriptive only.
7. **Mind the budget.** Pages can be huge: avoid per-node work that is not needed, read the DOM before writing to it, and keep
   the bundle within the limits in `scripts/check-size.mjs`.

## Pull requests

1. Branch from `main` (for example `feature/short-name` or `fix/short-name`).
2. Add tests: unit tests for logic, browser tests for anything that depends on real rendering.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and, for DOM changes, `pnpm test:e2e`.
4. If a published package changes, run `pnpm changeset` and describe the change for its users. Breaking changes are allowed
   before 1.0 but must be called out.

Releases are automated: merging changesets into `main` opens a release pull request, and merging that publishes to npm with
provenance.
