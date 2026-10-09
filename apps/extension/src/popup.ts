import "./popup.css";
import type { ReadingCadence } from "@clamly/anchor";
import {
  type AnchorSettings,
  getDomainFromUrl,
  getSettings,
  isRestrictedUrl,
  isSiteActive,
  saveSettings,
  siteStrengthKey,
  strengthFor,
  toggleDomainActive
} from "./shared/settings";

const enabledSwitch = requiredElement<HTMLButtonElement>("#enabled");
const toggleState = requiredElement<HTMLElement>("#toggle-state");
const strengthInput = requiredElement<HTMLInputElement>("#fixation-strength");
const strengthValue = requiredElement<HTMLOutputElement>("#strength-value");
const siteStrengthRow = requiredElement<HTMLElement>("#site-strength-row");
const siteStrengthInput = requiredElement<HTMLInputElement>("#site-strength");
const siteStrengthDomain = requiredElement<HTMLElement>("#site-strength-domain");
const fontSwitch = requiredElement<HTMLButtonElement>("#readable-font");
const spacingSwitch = requiredElement<HTMLButtonElement>("#extra-spacing");
const rulerSwitch = requiredElement<HTMLButtonElement>("#focus-ruler");
const cadenceInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="cadence"]'));
const cadenceHint = requiredElement<HTMLElement>("#cadence-hint");
const notice = requiredElement<HTMLElement>("#popup-notice");
const shortcut = requiredElement<HTMLElement>("#shortcut");
const siteCard = requiredElement<HTMLElement>("#site-card");
const siteDomain = requiredElement<HTMLElement>("#site-domain");
const siteStatusDot = requiredElement<HTMLElement>("#site-status-dot");
const siteStatusText = requiredElement<HTMLElement>("#site-status-text");
const siteToggleBtn = requiredElement<HTMLButtonElement>("#site-toggle-btn");
const restrictedNotice = requiredElement<HTMLElement>("#restricted-notice");

const CADENCE_HINTS: Record<ReadingCadence, string> = {
  all: "Every Word: anchors every eligible word.",
  saccade: "Saccade: leaves short function words like “the” and “of” unanchored.",
  alternating: "Alternating: anchors every other word in a paragraph for a lighter page."
};

let currentTabId: number | undefined;
let currentTabUrl: string | undefined;
let currentDomain = "";
let isRestricted = false;
let latest: AnchorSettings | undefined;
let strengthSaveTimeout: number | undefined;

void hydrate().catch(() => {
  showNotice("Anchor could not read this tab. Try reloading the extension.");
});

async function hydrate(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id;
  currentTabUrl = tab?.url;
  isRestricted = isRestrictedUrl(currentTabUrl);
  currentDomain = getDomainFromUrl(currentTabUrl);
  render(await getSettings());
  void showShortcut();
}

/** Shows the shortcut the user actually has, which they may have changed or removed. */
async function showShortcut(): Promise<void> {
  try {
    const commands = await chrome.commands.getAll();
    const keys = commands.find((command) => command.name === "toggle-anchor")?.shortcut;
    if (keys) {
      shortcut.textContent = keys;
      shortcut.hidden = false;
    }
  } catch {
    // Some browsers do not expose commands to the popup; the badge stays hidden.
  }
}

const flip = (button: HTMLButtonElement): boolean => button.getAttribute("aria-checked") !== "true";

enabledSwitch.addEventListener("click", () => void save({ enabled: flip(enabledSwitch) }));
fontSwitch.addEventListener("click", () => void save({ readableFont: flip(fontSwitch) }));
spacingSwitch.addEventListener("click", () => void save({ extraSpacing: flip(spacingSwitch) }));
rulerSwitch.addEventListener("click", () => void save({ focusRuler: flip(rulerSwitch) }));

for (const input of cadenceInputs) {
  input.addEventListener("change", () => {
    if (input.checked) void save({ cadence: input.value as ReadingCadence });
  });
}

strengthInput.addEventListener("input", () => {
  strengthValue.value = `${strengthInput.value}%`;
  const value = Number(strengthInput.value);
  // Sync storage allows a limited number of writes per minute, and a range input
  // fires dozens of events per drag: save once the user pauses.
  if (strengthSaveTimeout !== undefined) clearTimeout(strengthSaveTimeout);
  strengthSaveTimeout = window.setTimeout(() => {
    strengthSaveTimeout = undefined;
    void saveStrength(value);
  }, 400);
});

siteStrengthInput.addEventListener("change", () => {
  const settings = latest;
  if (!settings || !currentDomain) return;
  const siteStrength = { ...settings.siteStrength };
  if (siteStrengthInput.checked) {
    siteStrength[currentDomain] = Number(strengthInput.value);
  } else {
    const key = siteStrengthKey(settings, currentTabUrl);
    if (key) delete siteStrength[key];
  }
  void save({ siteStrength });
});

siteToggleBtn.addEventListener("click", async () => {
  if (!currentDomain || isRestricted) return;
  const next = toggleDomainActive(await getSettings(), currentDomain);
  await save({ customSites: next.customSites });
});

/** Saves the strength for this site if it has its own, otherwise for every site. */
async function saveStrength(value: number): Promise<void> {
  const settings = latest ?? (await getSettings());
  const key = siteStrengthKey(settings, currentTabUrl);
  if (key) await save({ siteStrength: { ...settings.siteStrength, [key]: value } });
  else await save({ fixationStrength: value });
}

async function save(update: Partial<AnchorSettings>): Promise<void> {
  try {
    // Open tabs and the background worker react to the storage change themselves.
    const settings = await saveSettings(update);
    render(settings);
    await ensureContentScript(settings);
  } catch {
    showNotice("Could not save this setting. Please try again in a moment.");
  }
}

/** Tabs opened before Anchor was switched on have no content script yet: add it to this one. */
async function ensureContentScript(settings: AnchorSettings): Promise<void> {
  if (currentTabId === undefined || !isSiteActive(settings, currentTabUrl)) {
    showNotice("");
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ["content.js"] });
    showNotice("");
  } catch {
    showNotice("This page does not allow extensions to change it.");
  }
}

function setSwitch(button: HTMLButtonElement, on: boolean, disabled = false): void {
  button.setAttribute("aria-checked", String(on));
  button.disabled = disabled;
}

function render(settings: AnchorSettings): void {
  latest = settings;
  const off = !settings.enabled;
  setSwitch(enabledSwitch, settings.enabled);
  toggleState.textContent = settings.enabled ? "On" : "Off";
  setSwitch(fontSwitch, settings.readableFont, off);
  setSwitch(spacingSwitch, settings.extraSpacing, off);
  setSwitch(rulerSwitch, settings.focusRuler, off);

  const strength = strengthFor(settings, currentTabUrl);
  strengthInput.value = String(strength);
  strengthInput.disabled = off;
  strengthValue.value = `${strength}%`;
  siteStrengthRow.hidden = !currentDomain || isRestricted;
  siteStrengthDomain.textContent = currentDomain || "this site";
  siteStrengthInput.checked = siteStrengthKey(settings, currentTabUrl) !== undefined;
  siteStrengthInput.disabled = off;

  for (const input of cadenceInputs) {
    input.checked = input.value === settings.cadence;
    input.disabled = off;
  }
  cadenceHint.textContent = CADENCE_HINTS[settings.cadence];

  if (isRestricted) {
    siteCard.hidden = true;
    restrictedNotice.hidden = false;
    return;
  }
  restrictedNotice.hidden = true;
  siteCard.hidden = false;
  siteDomain.textContent = currentDomain || "This page";

  const active = isSiteActive(settings, currentTabUrl);
  const selective = settings.siteMode === "selective";
  siteStatusDot.className = `site-status-dot ${active ? "active" : ""}`;
  siteStatusText.textContent = active
    ? "Anchor active on this page"
    : off
      ? "Reader paused"
      : selective
        ? "Not enabled for this site"
        : "Excluded for this site";
  siteToggleBtn.disabled = off || !currentDomain;
  siteToggleBtn.className = `site-toggle-btn ${active ? "active" : ""}`;
  siteToggleBtn.textContent = active ? "Active" : selective ? "Off" : "Excluded";
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
