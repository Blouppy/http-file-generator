import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for http-file-generator.
 *
 * Tests run against the production build (`npm run build` + `npm start`) for
 * reliability.  During local development you can override the base URL:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests sequentially inside each file (the app is stateless per page). */
  fullyParallel: true,
  /* Fail the build on CI if a test.only was accidentally committed. */
  forbidOnly: !!process.env.CI,
  /* No retries locally; one retry on CI to handle flakiness. */
  retries: process.env.CI ? 1 : 0,
  /* Limit workers to 1 on CI to avoid port conflicts when starting the server. */
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    /* Collect traces on first retry for easier debugging. */
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
