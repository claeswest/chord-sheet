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
  for (const way of [/Find a song with AI/, /I already have chords/, /Use a template/, /Build from scratch/, /Explore with a demo song/]) {
    await expect(dialog.getByRole("button", { name: way })).toBeVisible();
  }
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
