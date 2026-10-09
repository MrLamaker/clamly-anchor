import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "API reference" };

type Row = [name: string, type: string, defaultValue: string, description: string];

const TEXT_OPTIONS: Row[] = [
  ["fixationStrength", "number", "45", "Share of each word made bold, 0 to 100. Words of up to three characters always use one."],
  ["minimumWordLength", "number", "1", "Words with fewer characters stay unanchored. Counts user-perceived characters."],
  ["cadence", '"all" | "alternating" | "saccade"', '"all"', "Every word; every other word per paragraph; or skip function words."],
  ["locale", "string", "nearest lang", "BCP 47 tag. Picks saccade stop words and case rules."],
  ["stopWords", "string[]", "built-in", "Replaces the stop words that saccade leaves unanchored."],
  ["skipWords", "string[]", "[]", "Words to never anchor. Case- and normalization-insensitive."],
  ["shouldAnchorWord", "(context) => boolean", "none", "Your own rule; return false to leave a word alone."],
  ["anchorNumbers", "boolean", "false", "Anchor tokens that contain digits, such as 2026 or H2O."],
  ["skipScripts", "string[]", "see below", "Unicode scripts to leave alone, such as Han or Arabic."]
];

const DOM_OPTIONS: Row[] = [
  ["renderer", '"auto" | "highlight" | "dom"', '"auto"', "How anchors are drawn. See Getting started."],
  ["observe", "boolean", "true", "Keep anchors in sync when the page changes."],
  ["lazy", "boolean", "true", "Anchor content as it nears the viewport."],
  ["enabled", "boolean", "true", "Start with anchors on."],
  ["styles", "boolean", "true", "Add the default stylesheet. Turn off under a strict CSP and import styles.css."],
  ["skipSelector", "string", "none", "CSS selector for content to leave alone."],
  ["skipTags", "string[]", "[]", "Extra tag names to leave alone."],
  ["skipRoles", "string[]", "[]", "Extra ARIA roles to leave alone."],
  ["skipBoldText", "boolean", "true", "Leave text that is already bold (weight 600+) alone."],
  ["signal", "AbortSignal", "none", "Destroys the controller when it aborts."]
];

function OptionsTable({ rows }: { rows: Row[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Option</th>
          <th scope="col">Type</th>
          <th scope="col">Default</th>
          <th scope="col">Meaning</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, type, defaultValue, description]) => (
          <tr key={name}>
            <td>
              <code>{name}</code>
            </td>
            <td>
              <code>{type}</code>
            </td>
            <td>{defaultValue}</td>
            <td>{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ApiDocs() {
  return (
    <>
      <h1>API reference</h1>
      <p>
        Everything is exported from <code>@clamly/anchor</code> unless noted. Invalid options throw a <code>TypeError</code> that names
        every problem.
      </p>

      <h2>Live pages</h2>
      <h3>
        <code>createAnchor(target, options?)</code>
      </h3>
      <p>
        Anchors an element or a whole <code>document</code> and returns a controller: <code>enable()</code>, <code>disable()</code>,{" "}
        <code>toggle(force?)</code>, <code>update(options)</code>, <code>refresh()</code>, <code>flush()</code>, <code>destroy()</code>, and
        the read-only <code>enabled</code> and <code>renderer</code> (<code>&quot;highlight&quot;</code>, <code>&quot;dom&quot;</code>, or{" "}
        <code>&quot;none&quot;</code> when highlights were required but are unsupported).
      </p>
      <p>
        <code>flush()</code> anchors everything pending right away, including content far from the viewport; Anchor also does this before
        printing.
      </p>

      <h3>
        <code>processElement(element, options?)</code> and <code>restoreElement(element)</code>
      </h3>
      <p>
        One-shot anchoring with real bold markup, for static content. Calling it again redraws with new options. <code>restoreElement</code>{" "}
        puts the text back into the original text nodes; nothing is merged or replaced. It also accepts <code>onNodeProcessed</code>, called
        with each anchored node.
      </p>

      <h3>
        <code>isHighlightSupported(document?)</code>
      </h3>
      <p>Whether the browser supports the CSS Custom Highlight API renderer.</p>

      <h2>Text and markup</h2>
      <CodeBlock
        title="example.ts"
        code={`import { splitText, processText, getWordParts, getAnchorSpans } from "@clamly/anchor";

splitText("Reading dense text");
// [{ value: "Rea", bold: true }, { value: "ding ", bold: false }, ...]

processText("Fast & safe"); // escaped HTML with <b class="clamly-anchor-bold" data-clamly-anchor="fixation">
getWordParts("reader");     // { prefix: "rea", suffix: "der" }
getAnchorSpans("Reading");  // [{ start: 0, end: 3 }] in UTF-16 offsets, for custom renderers`}
      />
      <p>
        These functions give the same result on every server and browser. Advanced:{" "}
        <code>planAnchors(text, resolveOptions(options), state)</code> shares a word counter across several strings of one paragraph, and{" "}
        <code>graphemeClusters(word)</code> splits a word into user-perceived characters.
      </p>

      <h2>Reading metrics</h2>
      <CodeBlock
        title="example.ts"
        code={`import { calculateReadingMetrics } from "@clamly/anchor";

calculateReadingMetrics(article, { cadence: "saccade", wordsPerMinute: 238 });
// { wordCount, characterCount, fixationCount, fixationDensityPercentage,
//   wordsPerMinute, estimatedReadingTimeSeconds }`}
      />
      <p>
        Descriptive numbers only. The default rate, 238 words per minute, is the average for adult silent reading of non-fiction (Brysbaert,
        2019). Anchoring is not assumed to change it.
      </p>

      <h2>Options for every API</h2>
      <OptionsTable rows={TEXT_OPTIONS} />
      <p>
        By default <code>skipScripts</code> covers scripts written without spaces between words (Han, Hiragana, Katakana, Thai, Lao, Khmer,
        Myanmar and others) and, for markup, cursive scripts whose letters must stay joined (Arabic, Syriac and others). The highlight
        renderer never splits words, so it anchors cursive scripts too. The lists are exported as <code>NO_SPACE_SCRIPTS</code>,{" "}
        <code>JOINING_SCRIPTS</code> and <code>DEFAULT_SKIPPED_SCRIPTS</code>.
      </p>

      <h2>Options for live pages</h2>
      <OptionsTable rows={DOM_OPTIONS} />

      <h2>Subpath exports</h2>
      <ul>
        <li>
          <code>@clamly/anchor/toggle</code>: <code>createAnchorToggle(options)</code>, an accessible on/off button that remembers the
          choice
        </li>
        <li>
          <code>@clamly/anchor/element</code>: registers <code>&lt;clamly-anchor&gt;</code>; exports <code>defineAnchorElement(name?)</code>
        </li>
        <li>
          <code>@clamly/anchor/styles.css</code>: the default stylesheet, also exported as the <code>ANCHOR_CSS</code> string
        </li>
        <li>
          <code>dist/anchor.global.js</code> and <code>dist/anchor.auto.global.js</code>: browser builds for script tags
        </li>
      </ul>

      <h2>Constants</h2>
      <p>
        <code>STOP_WORDS</code> (by language: en, de, fr, es, it, pt, nl, ro), <code>SKIPPED_TAGS</code>, <code>SKIPPED_ROLES</code>,{" "}
        <code>BLOCK_TAGS</code>, <code>GENERATED_ATTRIBUTE</code> (<code>data-clamly-anchor</code>), <code>OPT_OUT_ATTRIBUTE</code> (
        <code>data-anchor</code>), <code>HIGHLIGHT_NAME</code> (<code>clamly-anchor</code>) and <code>DEFAULT_WORDS_PER_MINUTE</code>.
      </p>
    </>
  );
}
