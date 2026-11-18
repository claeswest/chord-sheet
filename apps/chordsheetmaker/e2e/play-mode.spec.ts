// Play mode, on the demo song: it scrolls, the key can be moved for the
// evening, chords can be hidden, and what needs an account says so.

import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

const FIRST_LYRIC = "Walking down the road at night";

/** The demo song, in play mode, not yet playing. It is written in A minor. */
async function openDemoInPlayMode(page: Page) {
  await page.goto("/editor/new?start=demo");
  await page.getByRole("banner").getByRole("button", { name: /^Play/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Demo Song" })).toBeVisible();
}

/** How far the song has scrolled, in pixels. */
function scrolled(page: Page): Promise<number> {
  return page.getByRole("heading", { level: 1, name: "Demo Song" }).evaluate((heading) => {
    let el = heading.parentElement;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    if (!el) throw new Error("the song is not inside anything that scrolls");
    return el.scrollTop;
  });
}

/**
 * Every place a chord of that name is on screen. On screen, because the page
 * also holds a hidden copy of the song laid out for print, which these tests
 * are not about.
 */
const chordNamed = (page: Page, name: string) => page.getByText(name, { exact: true }).filter({ visible: true });

test("Play scrolls the song and Space pauses it", async ({ page }) => {
  await openDemoInPlayMode(page);
  expect(await scrolled(page)).toBe(0);

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => scrolled(page), { timeout: 10_000 }).toBeGreaterThan(0);

  // The controls fade while a song plays, so pause the way a player would.
  await page.keyboard.press("Space");
  const stoppedAt = await scrolled(page);
  await page.waitForTimeout(800);
  expect(await scrolled(page)).toBe(stoppedAt);
});

test("the key moves a semitone at a time and goes back to the song's own", async ({ page }) => {
  await openDemoInPlayMode(page);
  await expect(page.getByRole("button", { name: "Key of Am, as written" })).toBeDisabled();
  await expect(chordNamed(page, "Am").first()).toBeVisible();

  await page.getByRole("button", { name: "Transpose up a semitone" }).click();
  const back = page.getByRole("button", { name: /^Key of Bbm, 1 semitone up/ });
  await expect(back).toBeVisible();
  await expect(chordNamed(page, "Bbm").first()).toBeVisible();
  await expect(chordNamed(page, "Am")).toHaveCount(0);

  await back.click();
  await expect(page.getByRole("button", { name: "Key of Am, as written" })).toBeDisabled();
  await expect(chordNamed(page, "Am").first()).toBeVisible();
});

test("Hide chords leaves the words and brings the chords back", async ({ page }) => {
  await openDemoInPlayMode(page);
  await expect(chordNamed(page, "Am").first()).toBeVisible();

  await page.getByRole("button", { name: /^Hide chords/ }).click();
  await expect(chordNamed(page, "Am")).toHaveCount(0);
  await expect(page.getByText(FIRST_LYRIC).filter({ visible: true })).toHaveCount(1);

  await page.getByRole("button", { name: /^Show chords/ }).click();
  await expect(chordNamed(page, "Am").first()).toBeVisible();
});

test("PDF and Share ask a visitor to make a free account", async ({ page }) => {
  await openDemoInPlayMode(page);
  const signUp = page.getByRole("link", { name: /Create a free account/ });

  await page.getByRole("button", { name: /^PDF/ }).click();
  await expect(page.getByRole("heading", { name: "Export this chart as a PDF" })).toBeVisible();
  await expect(signUp).toHaveAttribute("href", "/login");
  await page.getByRole("button", { name: "Maybe later" }).click();
  await expect(signUp).toHaveCount(0);

  await page.getByRole("button", { name: /^Share/ }).click();
  await expect(page.getByRole("heading", { name: "Share this chart with your band" })).toBeVisible();
  await expect(signUp).toHaveAttribute("href", "/login");
});

test("Edit leaves play mode for the editor", async ({ page }) => {
  await openDemoInPlayMode(page);
  await page.getByRole("button", { name: /^Edit/ }).click();
  await expect(page.getByRole("textbox", { name: "Song title" })).toHaveValue("Demo Song");
});
