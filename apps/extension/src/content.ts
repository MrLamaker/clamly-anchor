import { processElement, restoreElement, type ReadingCadence } from "@clamly/anchor";

(() => {
interface AnchorSettings {
  enabled: boolean;
  fixationStrength: number;
  cadence: ReadingCadence;
  focusRuler: boolean;
  siteMode: "all" | "selective";
  customSites: string[];
}

const DEFAULT_SETTINGS: AnchorSettings = {
  enabled: false,
  fixationStrength: 45,
  cadence: "all",
  focusRuler: false,
  siteMode: "all",
  customSites: []
};

const INSTALL_KEY = "__clamlyAnchorContentInstalled";
const contentWindow = window as Window & { [INSTALL_KEY]?: boolean };

// Guard against duplicate injections
if (contentWindow[INSTALL_KEY]) return;
contentWindow[INSTALL_KEY] = true;

let settings: AnchorSettings = DEFAULT_SETTINGS;
let observer: MutationObserver | undefined;
let debounceTimeout: number | undefined;
const pendingRoots = new Set<HTMLElement>();
let rulerElement: HTMLDivElement | null = null;

void initialise();

async function initialise(): Promise<void> {
  settings = await getContentSettings();
  applySettings();
  setupStorageListener();
}

/** Check if current page is restricted or allowed according to siteMode. */
function isCurrentSiteActive(): boolean {
  if (!settings.enabled) return false;
  const href = window.location.href;
  if (
    href.startsWith("chrome://") ||
    href.startsWith("chrome-extension://") ||
    href.startsWith("edge://") ||
    href.startsWith("about:") ||
    href.startsWith("view-source:") ||
    href.includes("chromewebstore.google.com") ||
    href.includes("chrome.google.com/webstore")
  ) {
    return false;
  }

  const hostname = window.location.hostname.replace(/^www\./, "");
  if (!hostname) return settings.siteMode === "all";

  if (settings.siteMode === "all") {
    // In "all" mode, customSites is the exclusion list
    return !settings.customSites.includes(hostname);
  } else {
    // In "selective" mode, customSites is the allowlist
    return settings.customSites.includes(hostname);
  }
}

function applySettings(): void {
  // Disconnect while restoring so internal mutations don't re-trigger
  observer?.disconnect();
  observer = undefined;
  pendingRoots.clear();

  const active = isCurrentSiteActive();

  // Manage Focus Ruler
  if (active && settings.focusRuler) {
    enableFocusRuler();
  } else {
    disableFocusRuler();
  }

  // Manage Anchor Fixations
  if (!active) {
    restoreElement(document.body);
    return;
  }

  restoreElement(document.body);
  processElement(document.body, {
    fixationStrength: settings.fixationStrength,
    cadence: settings.cadence
  });
  startObserving();
}

function startObserving(): void {
  if (observer) return;

  observer = new MutationObserver((records) => {
    if (!isCurrentSiteActive()) return;

    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          pendingRoots.add(node.parentElement);
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          pendingRoots.add(node as HTMLElement);
        }
      }
    }

    if (pendingRoots.size === 0) return;

    // Debounce mutation processing by 50ms to maintain 60fps on fast feeds
    if (debounceTimeout !== undefined) clearTimeout(debounceTimeout);
    debounceTimeout = window.setTimeout(() => {
      requestAnimationFrame(processPendingRoots);
    }, 50);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function processPendingRoots(): void {
  if (!isCurrentSiteActive()) {
    pendingRoots.clear();
    return;
  }

  for (const root of pendingRoots) {
    if (root.isConnected && !root.closest("#clamly-anchor-focus-ruler")) {
      processElement(root, {
        fixationStrength: settings.fixationStrength,
        cadence: settings.cadence
      });
    }
  }
  pendingRoots.clear();
}

/** Reading Focus Ruler */
function enableFocusRuler(): void {
  if (rulerElement) return;

  rulerElement = document.createElement("div");
  rulerElement.id = "clamly-anchor-focus-ruler";
  rulerElement.setAttribute("aria-hidden", "true");

  Object.assign(rulerElement.style, {
    position: "fixed",
    left: "0",
    right: "0",
    top: "50%",
    height: "36px",
    background: "rgba(141, 162, 251, 0.12)",
    borderTop: "1.5px solid rgba(141, 162, 251, 0.45)",
    borderBottom: "1.5px solid rgba(141, 162, 251, 0.45)",
    pointerEvents: "none",
    zIndex: "2147483646",
    transition: "top 70ms ease-out",
    mixBlendMode: "multiply",
    backdropFilter: "none"
  });

  document.documentElement.appendChild(rulerElement);

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
}

function disableFocusRuler(): void {
  if (!rulerElement) return;
  window.removeEventListener("pointermove", handlePointerMove);
  rulerElement.remove();
  rulerElement = null;
}

function handlePointerMove(e: PointerEvent): void {
  if (!rulerElement) return;
  const targetTop = Math.max(0, Math.min(window.innerHeight - 36, e.clientY - 18));
  rulerElement.style.top = `${targetTop}px`;
}

function setupStorageListener(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    void getContentSettings().then((fresh) => {
      settings = fresh;
      applySettings();
    });
  });
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isSettingsMessage(message)) return;
  settings = message.settings;
  applySettings();
});

function isSettingsMessage(message: unknown): message is { type: "anchor:settings-changed"; settings: AnchorSettings } {
  if (typeof message !== "object" || message === null) return false;
  const candidate = message as { type?: unknown; settings?: Partial<AnchorSettings> };
  return candidate.type === "anchor:settings-changed" && candidate.settings !== undefined;
}

async function getContentSettings(): Promise<AnchorSettings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    enabled: Boolean(stored.enabled),
    fixationStrength: Math.min(80, Math.max(0, Number(stored.fixationStrength ?? 45))),
    cadence: (["all", "alternating", "saccade"].includes(stored.cadence) ? stored.cadence : "all") as ReadingCadence,
    focusRuler: Boolean(stored.focusRuler),
    siteMode: stored.siteMode === "selective" ? "selective" : "all",
    customSites: Array.isArray(stored.customSites) ? stored.customSites : []
  };
}
})();
