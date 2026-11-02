import { defineConfig, devices } from "@playwright/test";

// The server is started by scripts/e2e.mjs, which also tears it down reliably on Windows.
export default defineConfig({
  testDir: "tests/e2e",
  // The in-memory store is shared, so a single worker keeps tests from interfering.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
