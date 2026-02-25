import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests",
  timeout: 10_000,
  use: {
    actionTimeout: 5_000,
    baseURL: "http://localhost:5174",
    navigationTimeout: 5_000,
    trace: "on-first-retry",
  },
  webServer: {
    command: "bunx --bun react-router dev --port 5174",
    env: {
      PLAYWRIGHT_TEST: "1",
    },
    reuseExistingServer: false,
    url: "http://localhost:5174",
  },
});
