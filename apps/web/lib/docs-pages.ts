/** The documentation pages in reading order. Each `href` is a route in app/docs. */
export const DOC_PAGES = [
  { href: "/docs", title: "Getting started" },
  { href: "/docs/react", title: "React" },
  { href: "/docs/vue", title: "Vue" },
  { href: "/docs/svelte", title: "Svelte" },
  { href: "/docs/web-component", title: "Web component" },
  { href: "/docs/script-tag", title: "Script tag" },
  { href: "/docs/markdown", title: "Markdown and MDX" },
  { href: "/docs/api", title: "API reference" },
  { href: "/docs/styling", title: "Styling" },
  { href: "/docs/accessibility", title: "Accessibility and research" }
] as const;
