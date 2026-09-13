import type { ReadingCadence } from "@clamly/anchor";

export interface AnchorSettings {
  enabled: boolean;
  fixationStrength: number;
  cadence: ReadingCadence;
  focusRuler: boolean;
  siteMode: "all" | "selective";
  customSites: string[];
}

export const DEFAULT_SETTINGS: AnchorSettings = {
  enabled: false,
  fixationStrength: 45,
  cadence: "all",
  focusRuler: false,
  siteMode: "all",
  customSites: []
};

export async function getSettings(): Promise<AnchorSettings> {
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

/** Check whether a URL is restricted from extension script injection by browser policy. */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:") ||
    url.startsWith("devtools://") ||
    url.includes("chromewebstore.google.com") ||
    url.includes("chrome.google.com/webstore")
  );
}

/** Extracts the clean domain hostname from a URL. */
export function getDomainFromUrl(url?: string): string {
  if (!url || isRestrictedUrl(url)) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Determines if Anchor should be visually active on the given URL based on settings. */
export function isSiteActive(settings: AnchorSettings, urlString?: string): boolean {
  if (!settings.enabled || isRestrictedUrl(urlString)) return false;
  const domain = getDomainFromUrl(urlString);
  if (!domain) return settings.siteMode === "all";

  if (settings.siteMode === "all") {
    // Enabled everywhere except excluded customSites
    return !settings.customSites.includes(domain);
  } else {
    // Selective mode: enabled only for allowed customSites
    return settings.customSites.includes(domain);
  }
}

/** Toggles whether the given domain is active. Returns updated settings. */
export function toggleDomainActive(settings: AnchorSettings, domain: string): AnchorSettings {
  if (!domain) return settings;
  const exists = settings.customSites.includes(domain);
  let nextSites: string[];

  if (settings.siteMode === "all") {
    // In "all" mode, customSites is the exclusion blocklist
    nextSites = exists ? settings.customSites.filter((s) => s !== domain) : [...settings.customSites, domain];
  } else {
    // In "selective" mode, customSites is the allowlist
    nextSites = exists ? settings.customSites.filter((s) => s !== domain) : [...settings.customSites, domain];
  }

  return {
    ...settings,
    customSites: nextSites
  };
}

