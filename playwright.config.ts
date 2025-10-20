// playwright.config.ts
// Basic Playwright config: set baseURL to your dev server and enable trace on retry.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
