// Entry for the browser global build (dist/anchor.global.js): exposes the full
// API as `window.ClamlyAnchor`, plus the toggle and the <clamly-anchor> element.

export { ClamlyAnchorElement, defineAnchorElement } from "./element";
export * from "./index";
export { createAnchorToggle, TOGGLE_CSS } from "./toggle";
