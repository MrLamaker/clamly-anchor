# @clamly/anchor

<p align="center">
  <a href="https://www.npmjs.com/package/@clamly/anchor"><img src="https://img.shields.io/npm/v/@clamly/anchor.svg?style=flat-square" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-7.x-3178c6.svg?style=flat-square" alt="TypeScript"></a>
  <a href="https://github.com/MrLamaker/clamly-anchor/actions/workflows/ci.yml"><img src="https://github.com/MrLamaker/clamly-anchor/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

> Zero-dependency TypeScript engine for saccadic text fixation and reading analytics.

`@clamly/anchor` creates artificial visual fixation points on words — inspired by saccadic eye movement research — without altering source text, screen-reader semantics, or page layouts. It is the core engine powering the [Clamly Anchor](https://github.com/MrLamaker/clamly-anchor) Chrome extension and web Reader Studio.

---

## Installation

```bash
npm install @clamly/anchor
# or
pnpm add @clamly/anchor
# or
yarn add @clamly/anchor
```

---

## API

### `splitText(text, options?)`

Splits a plain-text string into `TextSegment[]` — each segment has a `value` and a `bold` flag indicating whether it should be rendered as a fixation anchor.

```typescript
import { splitText } from "@clamly/anchor";

const segments = splitText("Reading dense material asks a lot of our attention.", {
  fixationStrength: 45,  // % of word used as anchor (default: 45)
  minimumWordLength: 1,  // min chars to be eligible (default: 1)
  cadence: "saccade",   // "all" | "alternating" | "saccade" (default: "all")
});

// Render segments yourself:
segments.forEach(({ value, bold }) => {
  const el = document.createElement(bold ? "b" : "span");
  el.textContent = value;
  container.appendChild(el);
});
```

---

### `calculateReadingMetrics(text, options?)`

Returns live reading statistics for a given block of text.

```typescript
import { calculateReadingMetrics } from "@clamly/anchor";

const metrics = calculateReadingMetrics(text, { cadence: "saccade" });

console.log(metrics.wordCount);                  // total words
console.log(metrics.fixationCount);              // words that got anchors
console.log(metrics.fixationDensityPercentage);  // 0–100 %
console.log(metrics.estimatedWordsPerMinute);    // baseline WPM
console.log(metrics.estimatedSecondsSaved);      // estimated time saved
```

---

### `processText(text, options?)`

Creates safe, ready-to-render HTML without accessing `document`, making it useful in Node.js, static-site generators, and server-rendered templates. Input text is HTML-escaped; only generated fixation prefixes use `<b class="clamly-anchor-bold">`.

```typescript
import { processText } from "@clamly/anchor";

const html = processText("Read <safely>", { cadence: "saccade" });
// '<b class="clamly-anchor-bold">R</b>ead &lt;...'
```

---

### `processElement(element, options?)`

Transforms all eligible text nodes inside a DOM element **in-place**, wrapping fixation prefixes in presentational `<b>` tags marked with Clamly Anchor's generated-data attributes.

```typescript
import { processElement } from "@clamly/anchor";

const article = document.querySelector("article")!;
processElement(article, { fixationStrength: 45, cadence: "saccade" });
```

Use `skipTags` and `skipRoles` to add protected regions. They are case-insensitive and supplement—not replace—the built-in safety list.

```typescript
processElement(article, {
  skipTags: ["aside", "figure"],
  skipRoles: ["status"],
  onNodeProcessed: ({ originalText, wrapper, fixationCount }) => {
    console.log(`Anchored ${fixationCount} words in: ${originalText}`);
    wrapper.dataset.processedBy = "my-reader";
  }
});
```

> **Screen-reader safe**: Uses `<b>` (presentational) not `<strong>` (semantic), so assistive technologies are not affected.

---

### `restoreElement(element)`

Fully reverses a `processElement` call — removes all injected wrappers and rejoins split text nodes, leaving zero orphaned attributes.

```typescript
import { restoreElement } from "@clamly/anchor";

restoreElement(article);
```

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `fixationStrength` | `number` | `45` | Percentage of each word used as the visual anchor (40–50 is optimal) |
| `minimumWordLength` | `number` | `1` | Words shorter than this are left untouched |
| `cadence` | `ReadingCadence` | `"all"` | Fixation rhythm: `"all"`, `"alternating"`, or `"saccade"` |

`processElement` also accepts `skipTags`, `skipRoles`, and `onNodeProcessed`. The callback receives `originalText`, the generated `wrapper`, and `fixationCount`.

Options are validated at runtime as well as by TypeScript: `fixationStrength` must be a finite number from 0 through 100, `minimumWordLength` a positive integer, and `cadence` one of the listed values. Invalid values throw `TypeError`; they are not silently coerced. For untyped configuration, use `isAnchorOptions(value)` or `assertValidAnchorOptions(value)` before processing.

### Cadence modes

| Mode | Description |
|---|---|
| `"all"` | Every eligible word gets an anchor — maximum fixation density |
| `"alternating"` | Every other word gets an anchor — airy, rhythm-driven flow |
| `"saccade"` | Content-rich words anchored; short stop words (*the, in, of*) left soft — mimics natural saccadic eye movement |

---

## TypeScript

Full type definitions are included. Key exported types:

```typescript
import type {
  AnchorOptions,
  ProcessElementOptions,
  ProcessedTextNode,
  ReadingCadence,
  ReadingMetrics,
  TextSegment,
  WordParts,
} from "@clamly/anchor";
```

---

## Design principles

- **Zero dependencies** — no runtime dependencies whatsoever
- **Screen-reader safe** — never uses `<strong>`; uses presentational `<b>` with `aria-hidden`
- **Layout safe** — inline wrappers preserve flex/grid word flow
- **Idempotent** — `processElement` → `restoreElement` leaves the DOM exactly as it was
- **Skips interactive regions** — ignores `<code>`, `<pre>`, `<input>`, `<textarea>`, editable regions, and ARIA navigation/menu roles

---

## License

MIT © [Clamly](https://github.com/MrLamaker)
