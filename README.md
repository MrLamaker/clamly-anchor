# Clamly Anchor

<p align="center">
  <img src="./apps/extension/public/icons/icon.svg" alt="Clamly Anchor Logo" width="84" height="84" />
</p>

<p align="center">
  <strong>An open-source cognitive accessibility reading suite for neurodivergent minds and dense text comprehension.</strong>
</p>

<p align="center">
  <a href="https://github.com/MrLamaker/clamly-anchor/actions/workflows/ci.yml"><img src="https://github.com/MrLamaker/clamly-anchor/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178c6.svg?style=flat-square" alt="TypeScript"></a>
  <a href="https://github.com/MrLamaker/clamly-anchor/pulls"><img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>
</p>

Clamly Anchor creates artificial visual fixation points (inspired by saccadic eye movement research) on words without altering source text, screen-reader semantics, or page layouts.

---

## Highlights

- **Saccadic Cadence Modes**:
  - `saccade`: Prioritizes content-rich words and keeps functional particles (*the, in, of, at*) soft to guide effortless eye jumps.
  - `all`: Classical high-fixation density across all eligible words.
  - `alternating`: Fixates every second word for an airy, rhythm-driven reading flow.
- **Real-time Reading Analytics**: Computes word counts, fixation density, active fixation counts, and estimated reading time savings in real-time.
- **Screen Reader & Layout Safe**: Never uses semantic `<strong>` tags (which disrupt text-to-speech tools). Uses presentational `<b>` prefixes within an inline wrapper so flex and grid layouts retain their original word flow.
- **Per-Site Domain Controls**: The Chrome extension lets you toggle Anchor for specific sites, exclude problematic domains, or run globally with one click.
- **Reading Focus Ruler**: Translucent horizontal reading guide that tracks your cursor to keep wide lines of text anchored.
- **Keyboard Shortcut**: Instant `Alt+Shift+A` hotkey to toggle reading assistance on any tab.
- **Zero Tracking & Local Only**: All text processing runs purely in memory within the client browser. Zero network requests or telemetry.

---

## Monorepo Architecture

```
reader/
├── packages/
│   └── core/            # @clamly/anchor (zero-dependency TS engine)
│       ├── src/processor.ts   # Fixation algorithm & reading metrics
│       ├── src/dom.ts         # TreeWalker DOM parser & restoration
│       └── test/              # Vitest test suite
├── apps/
│   ├── web/             # Next.js 15 App Router + Tailwind interactive Reader Studio
│   └── extension/       # Chrome Manifest V3 extension (Vite + TS)
└── .github/             # Issue templates, PR templates, and CI workflows
```

---

## Quickstart

### Requirements
- Node.js >= 20.x
- pnpm >= 9.x

```bash
# Install dependencies
pnpm install

# Run test suite
pnpm test

# Run type checking across all workspaces
pnpm typecheck

# Build all packages and applications
pnpm build
```

---

## Applications

### 1. Web Reader Studio (`apps/web`)

Launch the interactive showcase locally at `http://localhost:3000`:

```bash
pnpm dev:web
```

Features:
- **Curated Multi-Genre Library**: Academic cognitive science, ADHD essays, system architecture, and literary prose.
- **Live Comparison Slider**: Interactive before/after split viewer.
- **Reading Diagnostics**: Real-time WPM estimate, fixation density, and time saved.
- **Font & Display Switcher**: Test how Anchor looks with Sans, Serif, or Monospace typography.
- **Interactive Focus Ruler**: Preview the reading guide directly in the browser stage.
- **One-Click Export**: Copy plain text or formatted bold HTML.

### 2. Chrome Extension (`apps/extension`)

Build the standalone unpacked extension:

```bash
pnpm build:extension
```

To load in Chrome / Chromium browsers:
1. Open `chrome://extensions` in your browser.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select `apps/extension/dist`.
4. Press `Alt+Shift+A` or click the toolbar icon on any article to start reading!

---

## API Usage (`@clamly/anchor`)

```typescript
import { splitText, processElement, restoreElement, calculateReadingMetrics } from "@clamly/anchor";

// 1. Text processing for custom UIs
const segments = splitText("Reading dense material asks a lot of our attention.", {
  fixationStrength: 45,
  minimumWordLength: 1,
  cadence: "saccade"
});

// 2. Real-time reading metrics
const metrics = calculateReadingMetrics(text, { cadence: "saccade" });
console.log(`Estimated speed: ${metrics.estimatedWordsPerMinute} WPM`);
console.log(`Saved time: ${metrics.estimatedSecondsSaved} seconds`);

// 3. In-place DOM transformation
const article = document.querySelector("article");
processElement(article, { fixationStrength: 45, cadence: "saccade" });

// 4. Clean restoration
restoreElement(article);
```

---

## Contributing & Community

We welcome contributions from everyone! Whether you are optimizing fixation algorithms, testing assistive tools, or translating documentation, your contributions help make reading more accessible.

- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)

## License

MIT © [Clamly](https://github.com/clamly)

