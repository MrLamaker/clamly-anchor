import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Accessibility and research" };

export default function AccessibilityDocs() {
  return (
    <>
      <h1>Accessibility and research</h1>

      <h2>What Anchor changes</h2>
      <p>
        Only how text looks. Anchors use presentational <code>&lt;b&gt;</code> elements, never <code>&lt;strong&gt;</code>, so screen
        readers do not announce extra emphasis, and the accessible text of the page stays the same. The highlight renderer does not touch
        the DOM at all. The test suite compares the accessibility tree before and after anchoring in Chromium, Firefox and WebKit.
      </p>

      <h2>What Anchor leaves alone</h2>
      <ul>
        <li>Form fields, buttons, code, keyboard input, menus and navigation</li>
        <li>Widgets by ARIA role, such as tabs, comboboxes, switches and sliders</li>
        <li>Live regions, so screen readers do not announce anchored text again</li>
        <li>Editable areas, SVG and MathML</li>
        <li>
          Anything inside <code>data-anchor=&quot;off&quot;</code> or <code>translate=&quot;no&quot;</code>
        </li>
        <li>Text that is already bold, such as headings</li>
      </ul>

      <h2>Languages</h2>
      <p>
        Anchor splits words with its own rules, so results are identical on every server and browser. It never splits a letter from its
        accent or an Indic conjunct. Scripts written without spaces between words, such as Chinese, Japanese and Thai, are left alone by
        default: there is no evidence that partial bolding helps there. Markup output also leaves cursive scripts such as Arabic alone,
        because splitting a word across a weight change can break its letter joining; the highlight renderer anchors them safely.
      </p>

      <h2>What the research says</h2>
      <p>
        Anchors are a reading preference. Studies so far have not found that they make reading faster: a 2024 peer-reviewed study found no
        difference in reading times, and a test with 2,074 readers by Readwise found no speed benefit. Some readers simply find anchored
        text more comfortable to scan, and that is reason enough to offer it.
      </p>
      <p>So we recommend that you:</p>
      <ul>
        <li>Make anchors something readers switch on, not a default for everyone.</li>
        <li>Never describe anchors as a treatment for ADHD, dyslexia or any condition.</li>
        <li>
          Let readers <Link href="/self-test">measure their own reading</Link> instead of promising results.
        </li>
      </ul>
      <h3>Sources</h3>
      <ul>
        <li>
          <a href="https://research.vu.nl/en/publications/no-bionic-reading-does-not-work/" rel="noopener noreferrer">
            Snell, J. (2024). No, Bionic Reading does not work. Acta Psychologica.
          </a>
        </li>
        <li>
          <a href="https://blog.readwise.io/bionic-reading-results/" rel="noopener noreferrer">
            Readwise (2022). Does Bionic Reading actually work? We timed over 2,000 readers.
          </a>
        </li>
        <li>
          Brysbaert, M. (2019). How many words do we read per minute? A review and meta-analysis of reading rate. Journal of Memory and
          Language, 109.
        </li>
      </ul>

      <h2>Report a problem</h2>
      <p>
        If Anchor makes a page harder to use with assistive technology, please{" "}
        <a href="https://github.com/MrLamaker/clamly-anchor/issues" rel="noopener noreferrer">
          open an issue
        </a>
        . Accessibility problems are treated as bugs.
      </p>
    </>
  );
}
