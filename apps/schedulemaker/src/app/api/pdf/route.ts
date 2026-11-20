import { existsSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import type { Browser } from "puppeteer-core";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { cleanState } from "@/lib/sheetState";

// POST /api/pdf — a finished schedule in, a printed PDF out.
//
// "Printed" literally: a headless Chromium on the server opens this app's own
// /print page with the schedule, and saves it the way "Skriv ut" followed by
// "Spara som PDF" does on a parent's computer. So the PDF is vector — text is
// text, sharp at any size — and it is laid out by the same code as the sheet
// on screen, because it is the same code, running in a browser.
//
// This is the second thing this app sends to its server, after the photograph
// in /api/read, and it is handled the same way: used and gone. The schedule
// lives in this function's memory and in a browser tab that exists for a few
// seconds. It is not written anywhere, and nothing about it is logged — the
// error lines below say what failed, never what was on the sheet.

/** Starting a browser from cold, loading the page and printing takes 5–10 s. */
export const maxDuration = 60;
/** Give up with our own answer while the platform still lets us send one. */
const BUDGET_MS = 45_000;

/** A whole upper-secondary week with its glossary is about 15 kB. */
const MAX_BODY_CHARS = 300_000;

/** Where an installed browser is, for running this on a laptop. */
const LOCAL_BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

// Wide enough for the widest sheet (A3 landscape, 1587 px) to lay out without
// the window having a say. The sheet is sized in millimetres either way.
const VIEWPORT = { width: 1700, height: 1300, deviceScaleFactor: 1 };

async function launch(): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer-core");

  // On Vercel (which runs on Lambda) there is no browser installed, so one
  // comes along in the package: @sparticuz/chromium, unpacked to /tmp when
  // first asked for. Anywhere else, the browser that is already there.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const { default: chromium } = await import("@sparticuz/chromium");
    // No WebGL: a timetable has none, and it is one thing less to start.
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
      defaultViewport: VIEWPORT,
    });
  }

  const local = LOCAL_BROWSERS.find((p) => p && existsSync(p));
  if (!local) throw new Error("no browser found; set CHROME_PATH to a Chrome or Edge executable");
  return puppeteer.launch({ executablePath: local, headless: true, defaultViewport: VIEWPORT });
}

/**
 * The address of this app, as the request reached it — and only if it is one
 * of ours.
 *
 * The server's browser is sent to `<origin>/print`. Taking the origin from
 * the request is what makes that the same deployment the person is using; the
 * check is what stops a request with an invented Host from sending our
 * browser, with somebody's schedule in it, anywhere else.
 */
function ownOrigin(req: NextRequest): string | null {
  const url = new URL(req.url);
  const host = url.host;
  const ours = [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    "fixaschemat.se",
    "www.fixaschemat.se",
  ].filter(Boolean);
  if (ours.includes(host)) return `https://${host}`;
  if (!process.env.VERCEL && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  return null;
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  // A browser per request is the expensive thing here. Twenty a quarter-hour
  // is a parent trying every style on three children's schedules; it is not a
  // PDF service for whoever finds the address.
  if (!rateLimit(`pdf:${clientIp(req)}`, 20, 900_000)) {
    return fail(429, "Oj, det blev många PDF:er på kort tid! Vänta en stund och försök igen.");
  }

  const raw = await req.text().catch(() => "");
  if (raw.length === 0 || raw.length > MAX_BODY_CHARS) return fail(400, "Det där gick inte att läsa som ett schema.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail(400, "Det där gick inte att läsa som ett schema.");
  }
  const state = cleanState(parsed);
  if (!state) return fail(400, "Det där gick inte att läsa som ett schema.");

  const origin = ownOrigin(req);
  if (!origin) return fail(400, "Okänd adress.");

  let browser: Browser | null = null;
  const deadline = Date.now() + BUDGET_MS;
  const left = () => Math.max(1_000, deadline - Date.now());
  let step = "starting the browser";
  try {
    browser = await launch();
    const page = await browser.newPage();

    // The page needs this app's own files and nothing else. A schedule is
    // text and cannot ask for anything — this is for the day that stops
    // being true without anyone noticing.
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const u = r.url();
      if (u.startsWith(`${origin}/`) || u.startsWith("data:") || u.startsWith("blob:")) r.continue();
      else r.abort();
    });

    // Handed over before any of the page's own code runs. See /print.
    await page.evaluateOnNewDocument((s) => {
      (window as unknown as { __SHEET_STATE__: unknown }).__SHEET_STATE__ = s;
    }, state);

    step = "opening the print page";
    const res = await page.goto(`${origin}/print`, { waitUntil: "domcontentloaded", timeout: left() });
    if (!res || !res.ok()) throw new Error(`the print page answered ${res?.status() ?? "nothing"}`);

    step = "waiting for the sheet to lay itself out";
    await page.waitForFunction(() => document.documentElement.dataset.ready === "1", { timeout: left() });

    step = "printing";
    const pdf = await page.pdf({
      // The page says what paper it is (@page, written by /print); margins are
      // the sheet's own. Backgrounds on, or every style prints as plain paper.
      preferCSSPageSize: true,
      printBackground: true,
      timeout: left(),
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.byteLength),
        // A child's timetable. Not for any cache between here and the parent.
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // What failed and at which step — never the schedule.
    console.error(`[api/pdf] failed while ${step}: ${e instanceof Error ? e.message : String(e)}`);
    const timedOut = Date.now() >= deadline - 1_500 || (e instanceof Error && e.name === "TimeoutError");
    return timedOut
      ? fail(504, "Det tog för lång tid att skapa PDF:en. Försök igen.")
      : fail(502, "Det gick inte att skapa PDF:en just nu. Försök igen om en stund.");
  } finally {
    // Always, and not awaited past the answer's needs: a browser left running
    // is a schedule left in memory.
    if (browser) {
      await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 3_000))]).catch(() => {});
    }
  }
}
