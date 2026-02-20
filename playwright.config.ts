import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests",
  timeout: 10_000,
  use: {
    baseURL: "http://localhost:5174",
    actionTimeout: 5_000,
    navigationTimeout: 5_000,
    trace: "on-first-retry",
  },
  webServer: {
    command: "bunx --bun react-router dev --port 5174",
    url: "http://localhost:5174",
    reuseExistingServer: false,
    env: {
      PLAYWRIGHT_TEST: "1",
    },
  },
});
