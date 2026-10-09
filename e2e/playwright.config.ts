import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env["CI"]);

// Microsoft Edge runs the extension tests wherever it is installed (GitHub's
// Ubuntu runners have it). ANCHOR_E2E_EDGE=1 requires it, so CI cannot skip it.
const EDGE_PATHS = [
  "/opt/microsoft/msedge/msedge",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const EDGE = Boolean(process.env["ANCHOR_E2E_EDGE"]) || EDGE_PATHS.some((path) => existsSync(path));

// The documentation site is tested as built for production, once `pnpm build` has run.
const DOCS_BUILT = existsSync(new URL("../apps/web/.next/BUILD_ID", import.meta.url));

export default defineConfig({
  testDir: "tests",
  // Approved screenshots are only made in Playwright's Linux Docker image, so they need no platform suffix.
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "pnpm run serve",
      url: "http://localhost:5174/content.html",
      reuseExistingServer: !CI,
      timeout: 60_000
    },
    ...(DOCS_BUILT
      ? [
          {
            command: "pnpm --filter @clamly/anchor-web start --port 3100",
            url: "http://localhost:3100/docs",
            reuseExistingServer: !CI,
            timeout: 60_000
          }
        ]
      : [])
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ...(EDGE ? [{ name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" }, testMatch: "extension.spec.ts" }] : [])
  ]
});
