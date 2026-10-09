import type { ReadingCadence } from "@clamly/anchor";

export interface AnchorSettings {
  enabled: boolean;
  fixationStrength: number;
  cadence: ReadingCadence;
  focusRuler: boolean;
  /** "all": active everywhere except `customSites`. "selective": active only on `customSites`. */
  siteMode: "all" | "selective";
  /** Hostnames without "www.". Each entry also covers its subdomains. */
  customSites: string[];
  /** Strength for particular sites, overriding `fixationStrength` there. */
  siteStrength: Record<string, number>;
  /** More space between lines, letters, words and paragraphs (the WCAG 1.4.12 text-spacing values). */
  extraSpacing: boolean;
  /** Atkinson Hyperlegible Next for text in Latin script. */
  readableFont: boolean;
}

/** Above this share a word is almost entirely bold, which defeats the purpose. */
export const MAX_FIXATION_STRENGTH = 80;
/** Sync storage allows 8 KB per item; this keeps the per-site map well inside it. */
export const MAX_SITE_STRENGTHS = 200;
export const CONTENT_SCRIPT_ID = "clamly-anchor";
const CADENCES: readonly ReadingCadence[] = ["all", "alternating", "saccade"];
const HOSTNAME = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$|^\[[0-9a-f:.]+\]$/i;

export const DEFAULT_SETTINGS: AnchorSettings = Object.freeze({
  enabled: false,
  fixationStrength: 45,
  cadence: "all",
  focusRuler: false,
  siteMode: "all",
  customSites: [],
  siteStrength: {},
  extraSpacing: false,
  readableFont: false
}) as AnchorSettings;

function clampStrength(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_FIXATION_STRENGTH, Math.max(0, Math.round(number))) : undefined;
}

function isHostname(value: unknown): value is string {
  return typeof value === "string" && HOSTNAME.test(value);
}

/** Turns whatever is in storage (possibly from an older version) into valid settings. */
export function normalizeSettings(stored: Partial<Record<keyof AnchorSettings, unknown>>): AnchorSettings {
  const sites = Array.isArray(stored.customSites) ? stored.customSites : [];
  const strengths = typeof stored.siteStrength === "object" && stored.siteStrength !== null ? Object.entries(stored.siteStrength) : [];
  const siteStrength: Record<string, number> = {};
  // Keep the most recently added entries when there are too many.
  for (const [site, value] of strengths.slice(-MAX_SITE_STRENGTHS)) {
    const strength = clampStrength(value);
    if (isHostname(site) && strength !== undefined) siteStrength[site.toLowerCase()] = strength;
  }
  return {
    enabled: stored.enabled === true,
    fixationStrength: clampStrength(stored.fixationStrength) ?? DEFAULT_SETTINGS.fixationStrength,
    cadence: CADENCES.find((cadence) => cadence === stored.cadence) ?? DEFAULT_SETTINGS.cadence,
    focusRuler: stored.focusRuler === true,
    siteMode: stored.siteMode === "selective" ? "selective" : "all",
    customSites: Array.from(new Set(sites.filter(isHostname).map((site) => site.toLowerCase()))),
    siteStrength,
    extraSpacing: stored.extraSpacing === true,
    readableFont: stored.readableFont === true
  };
}

/** The site entry in `siteStrength` that applies to a URL: the most specific one. */
export function siteStrengthKey(settings: AnchorSettings, url?: string): string | undefined {
  const domain = getDomainFromUrl(url);
  if (!domain) return undefined;
  let best: string | undefined;
  for (const site of Object.keys(settings.siteStrength)) {
    if (isOnSite(domain, site) && (best === undefined || site.length > best.length)) best = site;
  }
  return best;
}

/** The strength to use on a URL: the site's own strength if it has one. */
export function strengthFor(settings: AnchorSettings, url?: string): number {
  const key = siteStrengthKey(settings, url);
  return key === undefined ? settings.fixationStrength : (settings.siteStrength[key] ?? settings.fixationStrength);
}

export async function getSettings(): Promise<AnchorSettings> {
  return normalizeSettings(await chrome.storage.sync.get({ ...DEFAULT_SETTINGS }));
}

export async function saveSettings(update: Partial<AnchorSettings>): Promise<AnchorSettings> {
  const next = normalizeSettings({ ...(await getSettings()), ...update });
  await chrome.storage.sync.set(next);
  return next;
}

/** Pages where browsers forbid extension scripts. */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:" && parsed.protocol !== "file:") return true;
  const host = parsed.hostname;
  return (
    host === "chromewebstore.google.com" ||
    (host === "chrome.google.com" && parsed.pathname.startsWith("/webstore")) ||
    host === "microsoftedge.microsoft.com" ||
    host === "addons.mozilla.org"
  );
}

/** The site name shown and stored for a URL: its hostname without "www.". */
export function getDomainFromUrl(url?: string): string {
  if (!url || isRestrictedUrl(url)) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Whether a hostname is the given site or one of its subdomains. */
export function isOnSite(hostname: string, site: string): boolean {
  return hostname === site || hostname.endsWith(`.${site}`);
}

export function isListedSite(settings: AnchorSettings, url?: string): boolean {
  const domain = getDomainFromUrl(url);
  return domain !== "" && settings.customSites.some((site) => isOnSite(domain, site));
}

/** Whether Anchor should be active on a URL. */
export function isSiteActive(settings: AnchorSettings, url?: string): boolean {
  if (!settings.enabled || isRestrictedUrl(url)) return false;
  const listed = isListedSite(settings, url);
  return settings.siteMode === "all" ? !listed : listed;
}

/** Adds the site to the list, or removes it and any of its subdomains. */
export function toggleDomainActive(settings: AnchorSettings, domain: string): AnchorSettings {
  if (!domain) return settings;
  const listed = settings.customSites.some((site) => isOnSite(domain, site));
  return {
    ...settings,
    customSites: listed
      ? settings.customSites.filter((site) => !isOnSite(domain, site) && !isOnSite(site, domain))
      : [...settings.customSites, domain]
  };
}

function sitePatterns(site: string): string[] {
  return [`*://${site}/*`, `*://*.${site}/*`];
}

/**
 * The content script registration for the current settings, or null when
 * Anchor should run nowhere. While Anchor is off no script is injected into
 * any page, so the extension cannot affect sites at all.
 */
export function contentScriptFor(settings: AnchorSettings): chrome.scripting.RegisteredContentScript | null {
  if (!settings.enabled) return null;
  const patterns = settings.customSites.flatMap(sitePatterns);
  const base = { id: CONTENT_SCRIPT_ID, js: ["content.js"], runAt: "document_idle" as const, persistAcrossSessions: true };
  if (settings.siteMode === "selective") return patterns.length > 0 ? { ...base, matches: patterns } : null;
  return { ...base, matches: ["<all_urls>"], ...(patterns.length > 0 ? { excludeMatches: patterns } : {}) };
}
