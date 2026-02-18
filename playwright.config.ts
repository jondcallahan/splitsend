import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 10_000,
  use: {
    baseURL: "http://localhost:5174",
    actionTimeout: 5_000,
    navigationTimeout: 5_000,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bunx --bun react-router dev --port 5174",
    url: "http://localhost:5174",
    reuseExistingServer: false,
    env: {
      PLAYWRIGHT_TEST: "1",
    },
  },
});
