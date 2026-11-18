// The pages anyone can open without an account: each one answers, shows its
// heading and does not crash. Cheap, and it is what catches a page broken by a
// change somewhere else entirely.

import { test, expect } from "./fixtures";
import { LANDING_PAGES } from "../src/data/landingPages";
import { EXAMPLE_SOURCES } from "../src/data/exampleSources";

// One keyword page and one example song stand in for the rest: they are all
// made by the same code from a list, and the list is where these come from, so
// renaming one does not break the test.
const keywordPage = LANDING_PAGES[0];
const example = EXAMPLE_SOURCES[0];

const PAGES = [
  { path: "/", heading: "Turn any song into a stunning chord chart" },
  { path: "/pricing", heading: "Plans & pricing" },
  { path: "/login", heading: "Sign in" },
  { path: "/terms", heading: "Terms of Service" },
  { path: "/privacy", heading: "Privacy" },
  { path: `/${keywordPage.slug}`, heading: null },
  { path: `/examples/${example.slug}`, heading: example.title },
];

for (const { path, heading } of PAGES) {
  test(`${path} opens`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    if (heading) await expect(h1).toHaveText(heading);
    else await expect(h1).not.toBeEmpty();
  });
}

test("an address that does not exist gets the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page-at-all");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page hit a wrong note");
});

test("pages that need an account send a visitor away instead of failing", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/admin");
  await expect(page).toHaveURL((url) => url.pathname === "/");
});

test("an example song can be played and offers to make your own", async ({ page }) => {
  await page.goto(`/examples/${example.slug}`);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Make your own/ })).toHaveAttribute("href", "/editor/new?start=demo");
  // The site's own examples are for playing: no export, no share link.
  await expect(page.getByRole("button", { name: /^PDF/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Share/ })).toHaveCount(0);
});
