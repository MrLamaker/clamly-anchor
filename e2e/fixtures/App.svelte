<script lang="ts">
import { anchor } from "@clamly/anchor-svelte";
import { onMount } from "svelte";
import { rendererFromUrl } from "./shared";

const renderer = rendererFromUrl();
let status = $state("loading results");
let single = $state("Single text child");
let items = $state(["Alpha", "Bravo", "Charlie"]);
let show = $state(true);
let enabled = $state(true);

onMount(() => {
  window.fixtureReady = true;
});
</script>

<section id="app-root" use:anchor={{ renderer, lazy: false, enabled }}>
  <h1>Framework fixture</h1>
  <p id="status">Status: {status}</p>
  <p id="single">{single}</p>
  <ul id="list">
    {#each items as item (item)}
      <li>{item} item</li>
    {/each}
  </ul>
  {#if show}
    <p id="optional">Optional paragraph text</p>
  {/if}
</section>
<div class="controls">
  <button
    type="button"
    id="update"
    onclick={() => {
      status = "done reading now";
      single = "Updated single child";
    }}>Update</button>
  <button type="button" id="reorder" onclick={() => (items = [...items].reverse())}>Reorder</button>
  <button type="button" id="remove" onclick={() => (show = false)}>Remove</button>
  <button type="button" id="toggle" onclick={() => (enabled = !enabled)}>Toggle</button>
</div>
