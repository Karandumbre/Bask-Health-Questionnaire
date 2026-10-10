import {
  readEnvironment,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_NAMES,
  ENVIRONMENT_KEYS,
  ENVIRONMENT_VALUES,
} from "./config/environment.mjs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Bask Health Intake Studio.
 * Enforces test isolation and safeguards production databases against destructive mutations.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!readEnvironment(ENVIRONMENT_KEYS.CI),
  retries: readEnvironment(ENVIRONMENT_KEYS.CI) ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL:
      readEnvironment(ENVIRONMENT_KEYS.PLAYWRIGHT_BASE_URL) ||
      ENVIRONMENT_DEFAULTS.PLAYWRIGHT_BASE_URL,
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
    command: "npx next start -p 3000 -H 127.0.0.1",
    url: ENVIRONMENT_DEFAULTS.PLAYWRIGHT_BASE_URL,
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      [ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]]:
        ENVIRONMENT_VALUES.ENABLED,
      [ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]]:
        "bask_test_auth_secret_minimum_32_characters_for_hmac_sha256",
      [ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.IS_TEST_DATABASE]]:
        ENVIRONMENT_VALUES.ENABLED,
    },
  },
});
