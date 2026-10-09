import { CONTENT_SCRIPT_ID, contentScriptFor, getSettings, isRestrictedUrl, saveSettings } from "./shared/settings";

// Content scripts are registered dynamically, only for the sites where Anchor
// is active. When Anchor is off, nothing runs on any page.
let syncing: Promise<void> = Promise.resolve();

function scheduleSync(): void {
  syncing = syncing.then(syncContentScript).catch((error: unknown) => {
    console.error("Clamly Anchor could not update its content script.", error);
  });
}

async function syncContentScript(): Promise<void> {
  const script = contentScriptFor(await getSettings());
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  if (existing.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  if (script) await chrome.scripting.registerContentScripts([script]);
}

chrome.runtime.onInstalled.addListener(scheduleSync);
chrome.runtime.onStartup.addListener(scheduleSync);
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync") scheduleSync();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-anchor") void toggleFromShortcut();
});

async function toggleFromShortcut(): Promise<void> {
  const settings = await saveSettings({ enabled: !(await getSettings()).enabled });
  if (!settings.enabled) return; // Open tabs remove their anchors when the setting changes.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || isRestrictedUrl(tab.url)) return;
  try {
    // Registered scripts only reach pages loaded from now on; cover the current tab immediately.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch {
    // The page refused injection (for example a PDF viewer); nothing else to do.
  }
}
