import { describe, expect, it } from "vitest";
import {
  type AnchorSettings,
  contentScriptFor,
  DEFAULT_SETTINGS,
  getDomainFromUrl,
  isRestrictedUrl,
  isSiteActive,
  MAX_SITE_STRENGTHS,
  normalizeSettings,
  siteStrengthKey,
  strengthFor,
  toggleDomainActive
} from "../src/shared/settings";

const settings = (overrides: Partial<AnchorSettings>): AnchorSettings => ({ ...DEFAULT_SETTINGS, enabled: true, ...overrides });

describe("normalizeSettings", () => {
  it("repairs values from storage instead of trusting them", () => {
    expect(
      normalizeSettings({
        enabled: "yes",
        fixationStrength: "95",
        cadence: "fast",
        siteMode: "x",
        customSites: ["Example.com", "bad host", 42, "example.com"],
        readableFont: 1
      })
    ).toEqual({
      enabled: false,
      fixationStrength: 80,
      cadence: "all",
      focusRuler: false,
      siteMode: "all",
      customSites: ["example.com"],
      siteStrength: {},
      extraSpacing: false,
      readableFont: false
    });
    expect(normalizeSettings({ fixationStrength: Number.NaN }).fixationStrength).toBe(45);
  });

  it("keeps valid per-site strengths, clamped, and caps how many are stored", () => {
    expect(normalizeSettings({ siteStrength: { "Wiki.org": 99, "bad host": 30, "news.com": "x", "docs.dev": 30.4 } }).siteStrength).toEqual(
      {
        "wiki.org": 80,
        "docs.dev": 30
      }
    );
    const many = Object.fromEntries(Array.from({ length: 250 }, (_, index) => [`site${index}.com`, 40]));
    const stored = normalizeSettings({ siteStrength: many }).siteStrength;
    expect(Object.keys(stored)).toHaveLength(MAX_SITE_STRENGTHS);
    expect(stored).toHaveProperty("site249.com");
    expect(stored).not.toHaveProperty("site0.com");
  });

  it("keeps the reading aids the reader switched on", () => {
    expect(normalizeSettings({ extraSpacing: true, readableFont: true, focusRuler: true })).toMatchObject({
      extraSpacing: true,
      readableFont: true,
      focusRuler: true
    });
  });
});

describe("strengthFor", () => {
  it("uses the most specific site strength, falling back to the global one", () => {
    const withSites = settings({ fixationStrength: 45, siteStrength: { "example.com": 30, "docs.example.com": 60 } });
    expect(strengthFor(withSites, "https://www.example.com/a")).toBe(30);
    expect(strengthFor(withSites, "https://docs.example.com/guide")).toBe(60);
    expect(siteStrengthKey(withSites, "https://api.docs.example.com/")).toBe("docs.example.com");
    expect(strengthFor(withSites, "https://other.org/")).toBe(45);
    expect(strengthFor(withSites, "chrome://settings")).toBe(45);
  });
});

describe("isRestrictedUrl", () => {
  it("flags pages where browsers forbid extensions", () => {
    for (const url of [
      undefined,
      "chrome://settings",
      "edge://extensions",
      "about:blank",
      "view-source:https://a.com",
      "https://chromewebstore.google.com/detail/x",
      "https://chrome.google.com/webstore/category",
      "https://addons.mozilla.org/"
    ]) {
      expect(isRestrictedUrl(url)).toBe(true);
    }
  });

  it("does not flag normal pages that only mention a store", () => {
    expect(isRestrictedUrl("https://example.com/?ref=chromewebstore.google.com")).toBe(false);
    expect(isRestrictedUrl("https://chrome.google.com/other")).toBe(false);
    expect(isRestrictedUrl("file:///home/me/notes.html")).toBe(false);
  });
});

describe("site rules", () => {
  it("strips www and treats subdomains as part of a site", () => {
    expect(getDomainFromUrl("https://www.Example.com/page")).toBe("example.com");
    const excluded = settings({ customSites: ["google.com"] });
    expect(isSiteActive(excluded, "https://docs.google.com/document")).toBe(false);
    expect(isSiteActive(excluded, "https://notgoogle.com/")).toBe(true);
  });

  it("allows only listed sites in selective mode", () => {
    const selective = settings({ siteMode: "selective", customSites: ["wikipedia.org"] });
    expect(isSiteActive(selective, "https://en.wikipedia.org/wiki/Reading")).toBe(true);
    expect(isSiteActive(selective, "https://example.com/")).toBe(false);
    expect(isSiteActive({ ...selective, enabled: false }, "https://en.wikipedia.org/")).toBe(false);
  });

  it("toggles a site, removing subdomain entries when it is turned back on", () => {
    const on = toggleDomainActive(settings({}), "news.example.com");
    expect(on.customSites).toEqual(["news.example.com"]);
    expect(toggleDomainActive(settings({ customSites: ["example.com", "other.org"] }), "news.example.com").customSites).toEqual([
      "other.org"
    ]);
  });
});

describe("contentScriptFor", () => {
  it("registers nothing while Anchor is off", () => {
    expect(contentScriptFor(settings({ enabled: false }))).toBeNull();
    expect(contentScriptFor(settings({ siteMode: "selective", customSites: [] }))).toBeNull();
  });

  it("runs everywhere except excluded sites", () => {
    expect(contentScriptFor(settings({ customSites: ["example.com"] }))).toMatchObject({
      matches: ["<all_urls>"],
      excludeMatches: ["*://example.com/*", "*://*.example.com/*"],
      js: ["content.js"]
    });
    expect(contentScriptFor(settings({}))).not.toHaveProperty("excludeMatches");
  });

  it("runs only on chosen sites in selective mode", () => {
    expect(contentScriptFor(settings({ siteMode: "selective", customSites: ["wikipedia.org"] }))).toMatchObject({
      matches: ["*://wikipedia.org/*", "*://*.wikipedia.org/*"]
    });
  });
});
