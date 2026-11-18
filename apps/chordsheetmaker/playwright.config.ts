import { defineConfig, devices } from "@playwright/test";

// Browser tests: a real Chromium clicks through the app the way a visitor
// would. `npm run e2e` at the repository root, or in CI (.github/workflows/ci.yml).
//
// They run against the production build, not the dev server, so build first
// (`npm run build` at the root). Playwright starts `next start` on a port of
// its own and stops it afterwards; a dev server on 3000 is left alone.
//
// What the tests may and may not touch is decided in e2e/fixtures.ts — read
// that before adding a test.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  // A stray `test.only` would silently skip every other test in CI.
  forbidOnly: !!process.env.CI,
  // One retry in CI: a slow runner should not turn the build red. A test that
  // passes only on the retry is reported as flaky, which is worth reading.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    // Kept for failed tests only: open with `npx playwright show-trace <file>`
    // to step through what the browser saw.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Reads the build from NEXT_DIST_DIR like the build that wrote it
    // (next.config.ts): the root scripts set it, CI leaves it at the default.
    command: `npm run start -- -p ${PORT}`,
    url: BASE_URL,
    // Always a server of our own, never one that happens to be on the port:
    // the point of the settings below is that we know what it can reach.
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
    // The test server has no database and no keys, on a laptop exactly as in
    // CI. These win over .env, so a test cannot write to the dev database,
    // send an email, charge a card or spend AI credit whatever it clicks.
    // The price is that only what works without an account can be tested;
    // signed-in tests will need a database made for them.
    env: {
      DATABASE_URL: "postgresql://e2e:e2e@localhost:5432/e2e",
      AUTH_SECRET: "e2e-only-not-a-real-secret",
      AUTH_URL: BASE_URL,
      GEMINI_API_KEY: "",
      RESEND_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      ERROR_WEBHOOK_URL: "",
      CRON_SECRET: "",
    },
  },
});
