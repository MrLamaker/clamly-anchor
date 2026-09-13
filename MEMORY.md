# Clamly Anchor — Session Handoff

Last updated: 2026-09-14

## Product Decisions & Ethos

- Public project name: **Clamly Anchor**.
- A cognitive-accessibility reading suite designed for neurodivergent minds (ADHD, dyslexia) and dense academic/technical text.
- Adds artificial visual fixation points without altering source text, screen reader semantics, or page layouts.
- Primary package name: `@clamly/anchor`.
- Clamly design tokens:
  - paper `#F2F0E3`
  - foreground / ink `#41413F`
  - card `#F9F7EE`
  - primary lavender `#8DA2FB`
  - sage accent `#81B29A`
  - border `#D6D3C0`
- Editorial, calm, high-legibility typographic aesthetic.

## Implemented Architecture & Features

### Core Package (`packages/core` — `@clamly/anchor`)
- **Fixation Algorithm & Cadence Modes**:
  - `saccade`: Prioritizes content words (skips common short functional stop words like *the, a, of, in*) to guide natural eye movement without visual fatigue.
  - `all`: Classical high-fixation density across all eligible words.
  - `alternating`: Fixates every other word for an airy, rhythmic flow.
  - Configurable `fixationStrength` (0–100%) and `minimumWordLength`.
- **Reading Analytics Engine**:
  - `calculateReadingMetrics(text, options)`: Returns word count, character count, fixation count, estimated baseline & anchored WPM, standard and anchored reading duration, seconds saved, and fixation density percentage.
- **DOM Engine & Safety**:
  - `TreeWalker` over `Node.TEXT_NODE`.
  - Wraps bold prefixes in presentational `<b>` tags (never `<strong>`, which disrupts screen readers).
  - Wrapper spans use `display: contents` to prevent layout corruption in flex/grid containers.
  - Robust element skipping: `<code>`, `<pre>`, `<script>`, `<style>`, `<svg>`, `<nav>`, `<dialog>`, `<menu>`, `<details>`, form inputs, `contenteditable`, and ARIA live regions.
  - Complete, idempotent restoration via `restoreElement(element)`.
- **Unit Tests**: 10 tests passing in Vitest covering word parts, cadences, Unicode, DOM traversal, and metrics.

### Web Reader Studio (`apps/web`)
- Next.js 15 App Router + Tailwind v4 showcase.
- **Curated Multi-Genre Sample Library**: Cognitive Science (Academic), ADHD & Flow (Reflective Essay), System Architecture (Technical), and Literary Prose.
- **Live Comparison Stage**: Split drag divider comparing raw unstyled text vs anchored text.
- **Real-Time Diagnostics Bar**: Live word count, active fixations, WPM speedup gauge, and estimated time saved.
- **Interactive Focus Ruler Preview**: Translucent reading guide bar tracking pointer movement.
- **Typography Switcher**: Instant preview with Sans, Serif, or Monospace fonts.
- **One-Click Export**: Copy plain text or formatted bold HTML.
- **Cognitive Principles Explainer**: Three editorial cards detailing saccadic guidance, visual crowding reduction, and screen-reader compliance.

### Chrome Extension (`apps/extension`)
- Chrome Manifest V3 extension built with Vite.
- **Full Icon Pack**: 16x16, 32x32, 48x48, 128x128 PNGs and SVG in `public/icons` and synced to `dist/icons`.
- **Per-Site Domain Controls**: Detects active domain (e.g. `wikipedia.org`), displays site badge with active/excluded state, and provides a 1-click domain toggle.
- **Cadence Pill Selector**: Switch between Saccade, Every Word, and Alternating directly from popup.
- **Reading Focus Ruler**: Toggleable reading bar that smoothly follows pointer across lines.
- **Keyboard Shortcut**: `Alt+Shift+A` registered in manifest and content script for instant toggling.
- **Browser Protection Handling**: Clear, user-friendly notice on restricted pages (`chrome://`, Chrome Web Store).
- **Debounced DOM MutationObserver**: 50ms batch buffer preventing micro-stutters during infinite scroll or rapid SPA updates.

### Open-Source Community & CI Scaffolding
- **GitHub Actions CI** (`.github/workflows/ci.yml`): Automates `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- **`CONTRIBUTING.md`**: Architecture overview, setup steps, and accessibility rules.
- **`CODE_OF_CONDUCT.md`**: Contributor Covenant v2.1.
- **`SECURITY.md`**: Security vulnerability disclosure process.
- **`README.md`**: Polished project showcase with usage examples and sideload instructions.

## Verification Status

- `pnpm test`: 10/10 Vitest tests passing.
- `pnpm typecheck`: Clean across all packages (`core`, `web`, `extension`).
- `pnpm build`: Clean production build across the entire workspace (`@clamly/anchor`, `@clamly/anchor-web`, and `@clamly/anchor-extension`).
- Sideload output ready at `apps/extension/dist` with icons, manifest, popup, and self-contained content script.

## Useful Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev:web
pnpm build:extension
```

