import "./popup.css";
import {
  DEFAULT_SETTINGS,
  getDomainFromUrl,
  getSettings,
  isRestrictedUrl,
  isSiteActive,
  toggleDomainActive,
  type AnchorSettings
} from "./shared/settings";
import type { ReadingCadence } from "@clamly/anchor";

const enabledInput = requiredElement<HTMLInputElement>("#enabled");
const strengthInput = requiredElement<HTMLInputElement>("#fixation-strength");
const strengthValue = requiredElement<HTMLOutputElement>("#strength-value");
const toggleState = requiredElement<HTMLElement>("#toggle-state");
const focusRulerInput = requiredElement<HTMLInputElement>("#focus-ruler");
const notice = requiredElement<HTMLElement>("#popup-notice");

// Site domain elements
const siteCard = requiredElement<HTMLElement>("#site-card");
const siteDomain = requiredElement<HTMLElement>("#site-domain");
const siteStatusDot = requiredElement<HTMLElement>("#site-status-dot");
const siteStatusText = requiredElement<HTMLElement>("#site-status-text");
const siteToggleBtn = requiredElement<HTMLButtonElement>("#site-toggle-btn");
const restrictedNotice = requiredElement<HTMLElement>("#restricted-notice");

// Cadence pills
const cadencePills = Array.from(document.querySelectorAll<HTMLButtonElement>(".cadence-pill"));
const cadenceHint = requiredElement<HTMLElement>("#cadence-hint");

let currentTabUrl: string | undefined;
let currentDomain: string = "";
let isRestricted: boolean = false;

const CADENCE_HINTS: Record<ReadingCadence, string> = {
  all: "Every Word: Highlights fixation points across all eligible words.",
  saccade: "Saccade: Prioritizes content words and keeps stop words soft.",
  alternating: "Alternating: Anchors every other word for an airy, rhythmic flow."
};

void hydrate();

async function hydrate(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabUrl = tab?.url;
  isRestricted = isRestrictedUrl(currentTabUrl);
  currentDomain = getDomainFromUrl(currentTabUrl);

  const settings = await getSettings();
  render(settings);
}

enabledInput.addEventListener("change", () => void save({ enabled: enabledInput.checked }));

strengthInput.addEventListener("input", () => {
  strengthValue.value = `${strengthInput.value}%`;
  void save({ fixationStrength: Number(strengthInput.value) });
});

focusRulerInput.addEventListener("change", () => {
  void save({ focusRuler: focusRulerInput.checked });
});

for (const pill of cadencePills) {
  pill.addEventListener("click", () => {
    const cadence = pill.dataset.cadence as ReadingCadence;
    if (cadence) void save({ cadence });
  });
}

siteToggleBtn.addEventListener("click", async () => {
  if (!currentDomain || isRestricted) return;
  const current = await getSettings();
  const next = toggleDomainActive(current, currentDomain);
  await save(next);
});

async function save(update: Partial<AnchorSettings>): Promise<void> {
  const next: AnchorSettings = { ...DEFAULT_SETTINGS, ...(await getSettings()), ...update };
  await chrome.storage.sync.set(next);
  render(next);
  await updateCurrentTab(next);
}

function render(settings: AnchorSettings): void {
  // Master switches
  enabledInput.checked = settings.enabled;
  toggleState.textContent = settings.enabled ? "On" : "Off";

  // Strength
  strengthInput.value = String(settings.fixationStrength);
  strengthInput.disabled = !settings.enabled;
  strengthValue.value = `${settings.fixationStrength}%`;

  // Focus ruler
  focusRulerInput.checked = settings.focusRuler;
  focusRulerInput.disabled = !settings.enabled;

  // Cadence pills
  for (const pill of cadencePills) {
    const isActive = pill.dataset.cadence === settings.cadence;
    pill.classList.toggle("active", isActive);
    pill.setAttribute("aria-checked", String(isActive));
    pill.disabled = !settings.enabled;
  }
  cadenceHint.textContent = CADENCE_HINTS[settings.cadence] ?? CADENCE_HINTS.saccade;

  // Site domain status
  if (isRestricted) {
    siteCard.hidden = true;
    restrictedNotice.hidden = false;
  } else {
    restrictedNotice.hidden = true;
    siteCard.hidden = false;
    siteDomain.textContent = currentDomain || "Current webpage";

    const activeOnThisSite = isSiteActive(settings, currentTabUrl);
    siteStatusDot.className = `site-status-dot ${activeOnThisSite ? "active" : ""}`;
    siteStatusText.textContent = activeOnThisSite
      ? "Anchor active on this page"
      : settings.enabled
        ? "Excluded for this site"
        : "Reader paused";

    siteToggleBtn.disabled = !settings.enabled;
    siteToggleBtn.className = `site-toggle-btn ${activeOnThisSite ? "active" : ""}`;
    siteToggleBtn.textContent = activeOnThisSite ? "Active" : "Excluded";
  }
}

async function updateCurrentTab(settings: AnchorSettings): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "anchor:settings-changed", settings });
    showNotice("");
  } catch {
    if (!settings.enabled || isRestricted) return;

    try {
      // Existing tabs do not receive declared content scripts until a refresh.
      // Injecting the built entry removes that requirement for normal webpages.
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      showNotice("Anchor activated on this tab.");
    } catch {
      if (isRestricted) {
        showNotice("Browser security policy restricts extensions on this tab.");
      }
    }
  }
}

function showNotice(message: string): void {
  notice.hidden = !message;
  notice.textContent = message;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required popup element not found: ${selector}`);
  return element;
}
