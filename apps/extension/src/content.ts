import { type AnchorController, createAnchor } from "@clamly/anchor";
import { createFocusRuler } from "./shared/focus-ruler";
import { createReadableFont } from "./shared/readable-font";
import { getSettings, isSiteActive, strengthFor } from "./shared/settings";
import { createTextSpacing } from "./shared/spacing";

const INSTALL_KEY = "__clamlyAnchorContent";
const scope = globalThis as typeof globalThis & { [INSTALL_KEY]?: true };

// The background worker registers this script only while Anchor is on, and the
// popup may inject it into tabs that were already open: install once per page.
if (!scope[INSTALL_KEY]) {
  scope[INSTALL_KEY] = true;
  install();
}

function install(): void {
  let controller: AnchorController | null = null;
  const ruler = createFocusRuler(document);
  const spacing = createTextSpacing(document);
  const font = createReadableFont(document, (path) => chrome.runtime.getURL(path));
  let queue: Promise<void> = Promise.resolve();

  async function apply(): Promise<void> {
    const settings = await getSettings();
    if (!isSiteActive(settings, location.href)) {
      // Restores the page exactly and stops observing it.
      controller?.destroy();
      controller = null;
      ruler.hide();
      spacing.hide();
      font.hide();
      return;
    }
    const options = { fixationStrength: strengthFor(settings, location.href), cadence: settings.cadence };
    // The highlight renderer leaves the page's DOM untouched wherever the browser supports it.
    if (controller) controller.update(options);
    else controller = createAnchor(document, { ...options, renderer: "auto" });
    if (settings.focusRuler) ruler.show();
    else ruler.hide();
    if (settings.extraSpacing) spacing.show();
    else spacing.hide();
    if (settings.readableFont) font.show();
    else font.hide();
  }

  // Settings changes arrive in order; never let two applications interleave.
  const scheduleApply = (): void => {
    queue = queue.then(apply).catch(() => undefined);
  };

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") scheduleApply();
  });
  scheduleApply();
}
