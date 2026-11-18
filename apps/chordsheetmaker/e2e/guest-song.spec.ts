// A visitor without an account: the start page leads to the demo, a song can
// be written and saved in the browser, and the library keeps it. This is the
// path most people take, and none of it needs the server to remember anything.

import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

const TITLE = "Kitchen Table Waltz";
const LYRIC = "Flour on the floor and the radio low";

/** Writes a one-line song from scratch and saves it. Ends in the editor. */
async function writeAndSaveSong(page: Page) {
  await page.goto("/editor/new");
  await page.getByRole("dialog", { name: "New chord sheet" }).getByRole("button", { name: /Build from scratch/ }).click();
  await page.getByRole("textbox", { name: "Song title" }).fill(TITLE);
  await page.getByRole("textbox", { name: "Type lyrics here…" }).fill(LYRIC);
  await page.getByRole("button", { name: "Save" }).click();
  // A saved song has an address of its own.
  await expect(page).toHaveURL(/\/editor\/new\?song=/);
}

test("the start page's button opens the demo song in the editor", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Build a chart free" }).first().click();

  await expect(page).toHaveURL(/\/editor\/new\?start=demo/);
  await expect(page.getByRole("textbox", { name: "Song title" })).toHaveValue("Demo Song");
  await expect(page.getByText("This is a demo song.")).toBeVisible();
  // It arrives with its chords in place.
  await expect(page.getByRole("button", { name: "Remove chord" }).first()).toBeVisible();
});

test("a new song starts by asking how, with every way in on offer", async ({ page }) => {
  await page.goto("/editor/new");
  const dialog = page.getByRole("dialog", { name: "New chord sheet" });
  // The first way is a field to type a title in, and that is where typing starts.
  await expect(dialog.getByRole("textbox", { name: "Find a song with AI" })).toBeFocused();
  for (const way of [/I already have chords/, /Use a template/, /Build from scratch/, /Explore with a demo song/]) {
    await expect(dialog.getByRole("button", { name: way })).toBeVisible();
  }
});

test("a title typed on the start screen is searched for at once", async ({ page }) => {
  // The AI is paid per request, so this test answers for it. A request that
  // got past these two would reach the guard and fail the test.
  const asked: string[] = [];
  const found = { title: "Paper Lanterns", artist: "The Tests", text: "Verse 1\n[Am]Paper lanterns [G]on the water" };
  await page.route("**/api/ai/search", (route) => {
    asked.push(route.request().postDataJSON().query);
    return route.fulfill({ json: found });
  });
  await page.route("**/api/ai/parse", (route) => route.fulfill({ json: found }));

  await page.goto("/editor/new");
  const search = page.getByRole("textbox", { name: "Find a song with AI" });
  await search.fill("paper lanterns");
  await search.press("Enter");

  // No second dialog to type it in again: the song is found and offered.
  await page.getByRole("button", { name: /Import$/ }).click();
  await expect(page.getByRole("textbox", { name: "Song title" })).toHaveValue("Paper Lanterns");
  expect(asked).toEqual(["paper lanterns"]);
});

test("Escape leaves the start screen for the library", async ({ page }) => {
  await page.goto("/editor/new");
  await expect(page.getByRole("dialog", { name: "New chord sheet" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/songs$/);
});

test("a chord picked in the palette is placed on a lyric line", async ({ page }) => {
  await page.goto("/editor/new");
  await page.getByRole("dialog", { name: "New chord sheet" }).getByRole("button", { name: /Build from scratch/ }).click();
  const line = page.getByRole("textbox", { name: "Type lyrics here…" });
  await line.fill(LYRIC);
  await expect(page.getByRole("button", { name: "Remove chord" })).toHaveCount(0);

  await page.getByRole("complementary").getByRole("button", { name: "G", exact: true }).click();
  // Chords go in the strip above the words, which says what a click will do.
  await page.getByTitle('Click to place "G"').click();

  await expect(page.getByRole("button", { name: "Remove chord" })).toHaveCount(1);
});

test("a slash chord is built from a root and a bass note", async ({ page }) => {
  await page.goto("/editor/new");
  await page.getByRole("dialog", { name: "New chord sheet" }).getByRole("button", { name: /Build from scratch/ }).click();
  await page.getByRole("textbox", { name: "Type lyrics here…" }).fill(LYRIC);
  const palette = page.getByRole("complementary");
  const bassF = palette.getByRole("button", { name: "Bass F", exact: true });

  // The bass notes wait for a root.
  await expect(bassF).toBeDisabled();
  await palette.getByRole("button", { name: "D", exact: true }).click();
  await bassF.click();
  await palette.getByRole("button", { name: "Bass sharp" }).click();
  await expect(bassF).toHaveAttribute("aria-pressed", "true");

  await page.getByTitle('Click to place "D/F#"').click();
  await expect(page.getByRole("button", { name: "Remove chord" })).toHaveCount(1);
  // Once placed it is one of the song's chords, a click away from the next line.
  const chip = palette.getByRole("button", { name: "D/F#", exact: true });
  await expect(chip).toBeVisible();

  // Choosing it there shows it in the builder too, ready to be changed.
  await palette.getByRole("button", { name: "Clear" }).click();
  await expect(bassF).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(bassF).toHaveAttribute("aria-pressed", "true");
});

test("a background picture that was replaced can be brought back", async ({ page }) => {
  // The smallest picture there is: one pixel.
  const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await page.goto("/editor/new?start=demo");
  await page.getByRole("button", { name: "Background", exact: true }).click();
  const current = page.getByAltText("The song's background picture");
  await expect(current).toHaveAttribute("src", "/demo-background.jpg");

  await page.getByRole("button", { name: "Upload image" }).click();
  await page.locator("#bg-upload-input").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: pixel });
  await expect(current).toHaveAttribute("src", /^data:image\//);

  // The demo's picture was replaced, not lost.
  await page.getByRole("button", { name: "Bring back earlier picture 1" }).click();
  await expect(current).toHaveAttribute("src", "/demo-background.jpg");
  // And the uploaded one is now the earlier picture.
  await expect(page.getByRole("button", { name: /^Bring back earlier picture/ })).toHaveCount(1);
});

test("saving as a visitor offers a free account to keep the song", async ({ page }) => {
  await writeAndSaveSong(page);
  await expect(page.getByRole("link", { name: /Keep my songs/ })).toHaveAttribute("href", /^\/login\?/);
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByRole("link", { name: /Keep my songs/ })).toHaveCount(0);
  // Declining leaves the song where it was.
  await expect(page.getByRole("textbox", { name: "Song title" })).toHaveValue(TITLE);
});

test("a saved song is in the library, and still there after a reload", async ({ page }) => {
  await writeAndSaveSong(page);

  await page.goto("/songs");
  const song = page.getByRole("link", { name: TITLE, exact: true });
  await expect(song).toBeVisible();

  await page.reload();
  await expect(song).toBeVisible();
});

test("a saved song opens for editing with its words intact", async ({ page }) => {
  await writeAndSaveSong(page);

  await page.goto("/songs");
  await page.getByRole("link", { name: "Edit", exact: true }).click();

  await expect(page.getByRole("textbox", { name: "Song title" })).toHaveValue(TITLE);
  await expect(page.getByRole("textbox", { name: "Type lyrics here…" })).toHaveValue(LYRIC);
});

test("a saved song opens in play mode from the library", async ({ page }) => {
  await writeAndSaveSong(page);

  await page.goto("/songs");
  await page.getByRole("link", { name: TITLE, exact: true }).click();

  await expect(page).toHaveURL(/\/view\?song=/);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  // Visible, because the page also holds a hidden copy laid out for print.
  await expect(page.getByText(LYRIC).filter({ visible: true })).toHaveCount(1);
});

test("deleting a song asks first, and then it is gone for good", async ({ page }) => {
  await writeAndSaveSong(page);
  await page.goto("/songs");
  const song = page.getByRole("link", { name: TITLE, exact: true });

  // Cancel keeps it.
  await page.getByRole("button", { name: "Delete song permanently" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete song?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(song).toBeVisible();

  await page.getByRole("button", { name: "Delete song permanently" }).click();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(song).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Your library is empty" })).toBeVisible();
});
