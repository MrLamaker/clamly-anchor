# Changelog

All notable changes to `@clamly/anchor` are documented here.

## 0.3.0

### Minor Changes

- 3a564eb: Safe on every website and framework, with live anchoring, many languages and honest metrics.
  
  **New**
  
  - `createAnchor(target, options)`: anchors an element or a whole document and keeps the anchors in sync as the page changes. Content is anchored as it nears the viewport, in small chunks, and before printing. The controller has `enable`, `disable`, `toggle`, `update`, `refresh`, `flush` and `destroy`.
  - Two renderers. `"highlight"` uses the CSS Custom Highlight API and never changes the DOM or reflows text. `"dom"` draws real bold text while keeping every text node the page owns in place. `"auto"` (default) picks highlights where supported.
  - `@clamly/anchor/toggle`: an accessible reader on/off button that remembers the choice and stays in sync across tabs.
  - `@clamly/anchor/element`: the `<clamly-anchor>` web component.
  - Script-tag builds: `dist/anchor.auto.global.js` (with the toggle) and `dist/anchor.global.js` (`window.ClamlyAnchor`).
  - `@clamly/anchor/styles.css` and `ANCHOR_CSS`, customisable with `--clamly-anchor-weight`, `--clamly-anchor-color` and `--clamly-anchor-shadow`.
  - Options: `locale`, `stopWords`, `anchorNumbers`, `skipScripts`, `skipSelector` and `skipBoldText`. Saccade stop words for English, German, French, Spanish, Italian, Portuguese, Dutch and Romanian.
  - `getAnchorSpans`, `planAnchors` and `graphemeClusters` for custom renderers and plugins.
  - Opt out of any element with `data-anchor="off"`; `translate="no"` is respected too.
  
  **Fixed**
  
  - Anchoring no longer breaks React, Vue or Svelte apps: text nodes owned by the page are never replaced, so updates, reordering and unmounting keep working.
  - `restoreElement` restores the original text nodes exactly and no longer merges adjacent text nodes.
  - SVG and MathML content is left alone (labels used to disappear).
  - Words are split by user-perceived characters, so accents and Indic conjuncts are never broken. Chinese, Japanese, Thai and other scripts without spaces are skipped by default; markup output also skips cursive scripts such as Arabic so their letters stay joined.
  - The `alternating` cadence keeps its rhythm across links and emphasis within a paragraph.
  - Paragraphs that already contain pre-rendered anchors are no longer anchored again.
  - Correct types for every module system: separate declarations for ES modules and CommonJS.
  
  **Breaking changes**
  
  - `calculateReadingMetrics` no longer claims a reading-speed gain. It returns `wordCount`, `characterCount`, `fixationCount`, `fixationDensityPercentage`, `wordsPerMinute` and `estimatedReadingTimeSeconds` (at 238 words per minute by default, configurable with `wordsPerMinute`). `estimatedWordsPerMinute`, `standardReadingTimeSeconds`, `anchoredReadingTimeSeconds` and `estimatedSecondsSaved` were removed: published studies have found no speed benefit from anchors.
  - Hyphenated compounds are anchored per part, tokens that contain digits are no longer anchored (set `anchorNumbers: true`), and URLs and email addresses are left alone.
  - `splitText` merges neighbouring plain text into one segment.
  - Generated markup changed: the page's text node stays in place (emptied) and is followed by the anchored copy, and `processText` output carries `data-clamly-anchor="fixation"`.
  - Defaults for skipped content changed: `<details>`, `<summary>` and `<dialog>` content is now anchored; ARIA widgets such as tabs, comboboxes and `role="button"` are skipped; already-bold text is skipped (`skipBoldText`).
  - The anchor weight now defaults to 700 through the bundled stylesheet.

## 0.2.0 - 2026-09-14

### Added

- `processText()` for safe, DOM-free HTML rendering.
- `skipWords` for case-insensitive, application-specific word dictionaries.
- `shouldAnchorWord()` with a typed word, normalized word, and index context.
- `skipTags`, `skipRoles`, and `onNodeProcessed` for DOM processing customization.
- `isAnchorOptions()`, `assertValidAnchorOptions()`, and `assertValidProcessElementOptions()` for runtime configuration validation.

### Changed

- Invalid anchor option values now throw `TypeError` rather than being silently clamped or rounded.

