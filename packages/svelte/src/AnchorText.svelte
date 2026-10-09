<!--
  Renders text with bold fixation prefixes as ordinary Svelte markup. The output
  is identical on the server and in every browser, so hydration never mismatches.
-->
<script lang="ts">
import { type AnchorOptions, splitText } from "@clamly/anchor";

interface Props extends AnchorOptions {
  /** The text to anchor. */
  text: string;
}

let { text, ...options }: Props = $props();
const segments = $derived(splitText(text, options));
</script>

{#each segments as segment}{#if segment.bold}<b class="clamly-anchor-bold" data-clamly-anchor="fixation">{segment.value}</b>{:else}{segment.value}{/if}{/each}
