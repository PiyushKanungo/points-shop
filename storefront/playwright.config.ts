import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next dev -p 3100",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SHOP_BACKEND: "stub",
      SITE_URL: BASE_URL,
      SESSION_SECRET: "e2e-session-secret-0123456789-abcdefghijkl",
      MAGIC_LINK_SECRET: "e2e-magic-link-secret-0123456789-abcdefgh",
      EMAIL_FROM: "Points Shop <shop@example.com>",
      OWNER_EMAIL: "owner@example.com",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      RESEND_API_KEY: "",
      STUB_FAIL: "",
    },
  },
});
