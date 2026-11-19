// Every browser test imports `test` and `expect` from here, not from
// @playwright/test, and so gets the guard below without asking for it.
//
// The guard is what makes it safe to run these on every push. The app's
// database apart, everything it talks to is the real thing: Google Analytics
// and Ads count real visits, the AI routes cost money, Stripe charges cards.
// A test must not be able to reach any of them, whatever it clicks.
//
//   1. Nothing leaves the app. A request to any other site is dropped, so a
//      test run is not a visit in Analytics and not a click in Ads. Songs then
//      show in fallback fonts (theirs come from Google Fonts), which no test
//      should depend on.
//   2. The activity log gets nothing. /api/activity is answered here.
//   3. A request to a route that costs money or acts on an account fails the
//      test, even though it is dropped: a test that got that far is wrong.
//   4. A crash fails the test even when the assertions pass: an uncaught
//      error in the page, or the app's own crash report (/api/client-error,
//      sent by the "wrong note" page).
//
// The server half of the same promise is in playwright.config.ts: the test
// server has no database and no keys.

import { test as base, expect } from "@playwright/test";

/**
 * Routes no page may call: AI (paid per request), payments, sharing, admin, the
 * daily job, and the owner's MCP server. (e2e/mcp.spec.ts talks to that last one
 * directly, not through a page, which is the only way anything should.)
 */
const FORBIDDEN = /\/api\/(ai|stripe|share|admin|cron|mcp)(\/|\?|$)/;

export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ context, baseURL }, use) => {
      const app = new URL(baseURL!).origin;
      const problems: string[] = [];

      await context.route(
        (url) => url.protocol.startsWith("http") && url.origin !== app,
        (route) => route.abort(),
      );
      await context.route("**/api/activity", (route) => route.fulfill({ status: 204 }));
      await context.route(FORBIDDEN, (route) => {
        const req = route.request();
        problems.push(`called ${req.method()} ${new URL(req.url()).pathname}, which tests must not reach`);
        return route.abort();
      });
      await context.route("**/api/client-error", (route) => {
        problems.push(`the app reported a crash: ${route.request().postData() ?? "(no details)"}`);
        return route.fulfill({ status: 204 });
      });
      context.on("weberror", (e) => problems.push(`uncaught error in the page: ${e.error().message}`));

      await use();

      expect(problems, "Nothing should have crashed or reached a forbidden route").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
