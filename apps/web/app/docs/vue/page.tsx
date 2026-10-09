import type { Metadata } from "next";
import { CodeBlock } from "../../../components/code-block";

export const metadata: Metadata = { title: "Vue" };

export default function VueDocs() {
  return (
    <>
      <h1>Vue and Nuxt</h1>
      <CodeBlock title="Terminal" code="npm install @clamly/anchor-vue" />
      <p>Works with Vue 3.3 and later, including server rendering and hydration.</p>

      <h2>Component and directive</h2>
      <CodeBlock
        title="Article.vue"
        code={`<script setup lang="ts">
import { AnchorText, vAnchor } from "@clamly/anchor-vue";

defineProps<{ summary: string }>();
</script>

<template>
  <p><AnchorText :text="summary" cadence="saccade" /></p>

  <article v-anchor="{ cadence: 'saccade' }">
    <slot />
  </article>
</template>`}
      />
      <p>
        <code>&lt;AnchorText&gt;</code> renders the same markup on the server and in the browser. <code>v-anchor</code> anchors everything
        inside its element and follows Vue&apos;s updates; it runs only in the browser.
      </p>

      <h2>Register globally</h2>
      <CodeBlock
        title="main.ts"
        code={`import { createApp } from "vue";
import { AnchorPlugin } from "@clamly/anchor-vue";
import App from "./App.vue";

createApp(App).use(AnchorPlugin).mount("#app");`}
      />

      <h2>Composable</h2>
      <CodeBlock
        title="Reader.vue"
        code={`<script setup lang="ts">
import { ref } from "vue";
import { useAnchor } from "@clamly/anchor-vue";

const article = ref<HTMLElement | null>(null);
const strength = ref(45);
const anchor = useAnchor(article, () => ({ fixationStrength: strength.value }));
</script>

<template>
  <input v-model.number="strength" type="range" min="0" max="80" />
  <button type="button" @click="anchor?.toggle()">Reading anchors</button>
  <article ref="article"><slot /></article>
</template>`}
      />

      <h2>Styles</h2>
      <p>
        Import <code>@clamly/anchor/styles.css</code> once if you use <code>&lt;AnchorText&gt;</code>; live anchoring adds it automatically.
      </p>
    </>
  );
}
