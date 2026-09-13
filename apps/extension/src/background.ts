/**
 * Receives the manifest-defined keyboard shortcut outside the page context.
 * Content scripts are not present on tabs that were already open when the
 * extension was installed, so the handler also injects the bundled script.
 */
chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-anchor") return;
  void toggleAnchorForActiveTab();
});

async function toggleAnchorForActiveTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const { enabled = false } = await chrome.storage.sync.get({ enabled: false });
    await chrome.storage.sync.set({ enabled: !enabled });

    // Safe to call when the declared content script is already installed: its
    // per-window guard exits before registering duplicate observers/listeners.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } catch {
    // Chrome blocks injection on protected browser and store pages.
  }
}
