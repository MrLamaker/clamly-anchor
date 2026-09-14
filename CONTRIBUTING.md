# Contributing to Clamly Anchor

Thank you for your interest in contributing to Clamly Anchor! We welcome contributions from developers, designers, accessibility researchers, and neurodivergent community members.

Anchor is an open-source cognitive accessibility suite designed to support individuals with ADHD, dyslexia, and anyone who reads dense text.

## Monorepo Architecture

Anchor is organized as a pnpm monorepo:

- **`packages/core` (`@clamly/anchor`)**: A zero-dependency, headless TypeScript package containing the fixation algorithm, DOM traversal engine, and reading analytics.
- **`apps/web`**: Next.js (App Router) + Tailwind CSS interactive Reader Studio and public showcase.
- **`apps/extension`**: Manifest V3 browser extension built with Vite, featuring per-site activation, reading focus ruler, and customizable cadence modes.

## Development Setup

### Prerequisites

- Node.js >= 24.x
- pnpm 12.4.1

### Getting Started

```bash
# Clone the repository
git clone https://github.com/MrLamaker/clamly-anchor.git
cd clamly-anchor

# Install dependencies
pnpm install

# Run unit tests
pnpm test

# Run type checking
pnpm typecheck

# Start the web playground dev server
pnpm dev:web

# Build the Chrome extension
pnpm build:extension
```

### Loading the Unpacked Extension

1. Run `pnpm build:extension`.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `apps/extension/dist` folder.

## Core Design & Accessibility Principles

When modifying code in this repository, always uphold these non-negotiable accessibility principles:

1. **Never use `<strong>` for visual fixation anchors**:
   - Assistive screen readers (like NVDA, JAWS, VoiceOver) announce `<strong>` tags as verbal emphasis, making listening unbearable.
   - Use presentational `<b>` tags or CSS spans with `class="clamly-anchor-bold"`.
2. **Preserve DOM Layout (inline wrapper)**:
   - Each transformed text node must retain one inline wrapper. Do not use `display: contents`, which turns prefixes and suffixes into separate flex or grid items.
3. **Respect Interactive & Semantic Regions**:
   - Skip text inside `<code>`, `<pre>`, `<script>`, `<style>`, `<svg>`, `<textarea>`, `<input>`, and regions with `role="navigation"`, `role="menu"`, or `isContentEditable`.
4. **Idempotency & Restoration**:
   - Any DOM processed by `processElement()` must be 100% cleanly restorable via `restoreElement()`, leaving zero orphaned attributes or split text nodes.

## Pull Request Guidelines

1. Create a feature branch: `git checkout -b feature/your-feature`.
2. Ensure all tests and type checks pass:
   ```bash
   pnpm test
   pnpm typecheck
   pnpm build
   ```
3. Add unit tests for any new core logic or bug fixes.
4. Keep commit messages clear, descriptive, and focused.
