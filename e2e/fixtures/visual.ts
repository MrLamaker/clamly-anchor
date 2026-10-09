import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource-variable/noto-sans-thai";
import * as anchor from "@clamly/anchor";
import "./shared";

window.anchorApi = anchor;

// Screenshots must never catch a fallback font: load every face the page needs first.
await Promise.all(
  Array.from(document.querySelectorAll("section"), (section) => {
    const style = getComputedStyle(section);
    return document.fonts.load(`${style.fontSize} ${style.fontFamily}`, section.textContent ?? "");
  })
);
window.ready = true;
