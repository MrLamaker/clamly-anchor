import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "Svelte" };

export default function SvelteDocs() {
  return (
    <>
      <h1>Svelte and SvelteKit</h1>
      <CodeBlock title="Terminal" code="npm install @clamly/anchor-svelte" />
      <p>
        Requires Svelte 5. The action only runs in the browser, so it is safe with SvelteKit server rendering, and the component renders the
        same markup on the server and in the browser.
      </p>

      <h2>Component and action</h2>
      <CodeBlock
        title="Article.svelte"
        code={`<script lang="ts">
  import { AnchorText, anchor } from "@clamly/anchor-svelte";

  let { summary, body } = $props();
</script>

<p><AnchorText text={summary} cadence="saccade" /></p>

<article use:anchor={{ cadence: "saccade" }}>
  {@html body}
</article>`}
      />

      <h2>Custom markup</h2>
      <p>For full control over the markup, render the segments yourself:</p>
      <CodeBlock
        title="Custom.svelte"
        code={`<script lang="ts">
  import { anchorSegments } from "@clamly/anchor-svelte";

  let { text } = $props();
</script>

{#each anchorSegments(text) as part}{#if part.bold}<mark>{part.value}</mark>{:else}{part.value}{/if}{/each}`}
      />

      <h2>Styles</h2>
      <p>
        Import <code>@clamly/anchor/styles.css</code> once if you use <code>&lt;AnchorText&gt;</code>; the action adds it automatically.
      </p>
    </>
  );
}
