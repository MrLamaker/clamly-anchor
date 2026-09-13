You are an expert full-stack TypeScript developer and open-source maintainer. Your task is to scaffold a new open-source project called `focus-reader-core` under the Clamly umbrella. 

### Project Overview
`focus-reader-core` is a cognitive accessibility tool that processes text to create artificial "fixation points" (similar to Bionic Reading), helping neurodivergent students (ADHD, dyslexia) read dense academic text faster. 

The project will be structured as a monorepo containing three parts:
1. `packages/core`: A headless, dependency-free TypeScript NPM package.
2. `apps/web`: A Next.js interactive demo website/playground.
3. `apps/extension`: A Chrome Manifest V3 extension implementing the core package.

### Part 1: The Core Package (`packages/core`)
**Stack:** TypeScript, tsup (or Vite) for bundling.
**Requirements:**
1. **Fixation Algorithm (`processor.ts`):** 
   - A function that takes a word and determines how many letters to bold based on its length. 
   - 1-3 letters: bold the first letter. 
   - 4+ letters: bold roughly the first 40-50% of the word.
2. **DOM Traversal (`dom.ts`):** 
   - A function that accepts an HTML element and uses the `TreeWalker` API to iterate over `Node.TEXT_NODE` elements only.
   - Ignore text inside tags like `<script>`, `<style>`, `<code>`, `<pre>`, `<svg>`, and `<noscript>`.
3. **Accessibility:**
   - Do NOT wrap text in `<strong>` tags, as this breaks screen readers. 
   - Wrap the bolded prefix in a `<b>` tag (which lacks semantic weight) or a `<span class="focus-reader-bold">` with inline CSS `font-weight: 700`.
4. **API Export:** Export a main class or function (e.g., `FocusReader.process(element, options)`) where options include `fixationStrength` and `skipShortWords`.

### Part 2: The Demo Website (`apps/web`)
**Stack:** Next.js (App Router), Tailwind CSS.
**Requirements:**
1. **Layout:** A clean, minimalist UI (colors: #F5F4EC background, #3B3B3B text).
2. **Playground component (`page.tsx`):** 
   - A split-screen UI. 
   - Left side: A `<textarea>` with default sample text.
   - Right side: A rendered `<div>` that displays the processed text dynamically using the `@clamly/focus-reader-core` package.
3. **Controls:** Add two range sliders below the text area: one for "Fixation Strength" and one for "Minimum Word Length". Ensure the output updates in real-time as sliders change.

### Part 3: The Chrome Extension (`apps/extension`)
**Stack:** Manifest V3, TypeScript, Webpack/Vite.
**Requirements:**
1. **Manifest.json:** Setup permissions for `activeTab`, `storage`, and `scripting`.
2. **Content Script:** 
   - Import the `@clamly/focus-reader-core` package.
   - Run the DOM processor on `document.body` on load.
   - Use a `MutationObserver` to process new text that gets dynamically injected (for infinite scrolling sites).
3. **Popup UI:** A simple HTML/Tailwind popup with a toggle to enable/disable the reader, and a slider to adjust the intensity (saving state to `chrome.storage.sync`).

### Your Instructions:
Please generate the foundational codebase for this monorepo step-by-step. 

1. Start by providing the directory structure for the monorepo (`package.json`, workspace config).
2. Write the core logic for `packages/core/src/processor.ts` and `dom.ts`.
3. Write the main Next.js Playground UI in `apps/web/app/page.tsx`.
4. Write the Manifest V3 `manifest.json` and the content script logic for the extension.

Write clean, modular, and heavily commented code. Let's begin with the Monorepo setup and the Core Package.