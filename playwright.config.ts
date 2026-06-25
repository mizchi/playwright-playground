import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "blob" : "list",
  webServer: {
    command: "pnpm app:build && pnpm app:preview",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "UTC",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
