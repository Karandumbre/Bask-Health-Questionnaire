import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Bask Health Intake Studio.
 * Enforces test isolation and safeguards production databases against destructive mutations.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next start -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 60000,
    env: {
      ENABLE_TEST_AUTH: "true",
      TEST_AUTH_SECRET:
        "bask_test_auth_secret_minimum_32_characters_for_hmac_sha256",
      IS_TEST_DATABASE: "true",
    },
  },
});
