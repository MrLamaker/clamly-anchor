# @clamly/anchor-svelte

Svelte 5 component and action for [Clamly Anchor](https://github.com/MrLamaker/clamly-anchor) reading anchors, safe with SvelteKit
server rendering.

```bash
npm install @clamly/anchor-svelte
```

## Component and action

```svelte
<script lang="ts">
  import { AnchorText, anchor } from "@clamly/anchor-svelte";

  let { summary, body } = $props();
</script>

<p><AnchorText text={summary} cadence="saccade" /></p>

<article use:anchor={{ cadence: "saccade" }}>
  {@html body}
</article>
```

`<AnchorText>` renders identical markup on the server and in the browser. `use:anchor` anchors everything inside the element,
follows Svelte's updates and option changes, and restores the element when it is destroyed.

## Custom markup

```svelte
<script lang="ts">
  import { anchorSegments } from "@clamly/anchor-svelte";
  let { text } = $props();
</script>

{#each anchorSegments(text) as part}{#if part.bold}<mark>{part.value}</mark>{:else}{part.value}{/if}{/each}
```

## Styles

The action adds Anchor's stylesheet automatically. For `<AnchorText>`, import `@clamly/anchor/styles.css` once.

All options are documented in [`@clamly/anchor`](../core).

## License

MIT © [Clamly](https://clamly.app)
