import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "Script tag" };

const OPTIONS: Array<[string, string]> = [
  ["data-target", "CSS selector of the content to anchor. Default: the whole page."],
  ["data-strength", "Share of each word made bold, 0 to 100."],
  ["data-cadence", "all, alternating or saccade."],
  ["data-renderer", "auto, highlight or dom."],
  ["data-locale", "Language for saccade stop words, such as fr."],
  ["data-toggle", "Set to false to hide the reader's button; anchors are then always on."],
  ["data-default", "Set to on to start with anchors on until the reader chooses."],
  ["data-label", "Button text. Default: Reading anchors."],
  ["data-storage-key", "localStorage key that remembers the reader's choice. Default: clamly-anchor."]
];

export default function ScriptTagDocs() {
  return (
    <>
      <h1>One script tag</h1>
      <p>
        For sites without a build step, such as WordPress, Ghost or plain HTML. Add the script and readers get a button that turns anchors
        on and off and remembers their choice.
      </p>
      <CodeBlock
        title="index.html"
        code={`<script
  src="https://cdn.jsdelivr.net/npm/@clamly/anchor@0.3/dist/anchor.auto.global.js"
  data-target="article"
  data-cadence="saccade"
  defer
></script>`}
      />
      <p>
        Pin a version (as above) and consider adding an <code>integrity</code> attribute: jsDelivr shows the hash for every file. Anchors
        are off until each reader switches them on.
      </p>

      <h2>Options</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Attribute</th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {OPTIONS.map(([name, meaning]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Scripting it</h2>
      <p>
        The script exposes <code>window.clamlyAnchor</code> with the <code>controller</code> and the <code>toggle</code>. For full control,
        load <code>anchor.global.js</code> instead, which exposes the whole API as <code>window.ClamlyAnchor</code>:
      </p>
      <CodeBlock
        title="index.html"
        code={`<script src="https://cdn.jsdelivr.net/npm/@clamly/anchor@0.3/dist/anchor.global.js"></script>
<script>
  const anchor = ClamlyAnchor.createAnchor(document.querySelector("main"), { enabled: false });
  ClamlyAnchor.createAnchorToggle({ controller: anchor, label: "Bold starts" });
</script>`}
      />
    </>
  );
}
