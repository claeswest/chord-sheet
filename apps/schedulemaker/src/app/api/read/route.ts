import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TEXT_MODEL, geminiUrl, geminiFetch } from "@clavos/core/ai";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { READ_PROMPT, ReadError, parseSchedule } from "@/lib/readSchedule";

// POST /api/read — a photograph of a timetable in, a structured one out.
//
// Nothing is stored. There is no database in this app and no account: the
// schedule goes back to the browser and lives there until it is printed. That
// is not a temporary shortcut. A photographed school timetable carries a
// child's name, class and school, and the least risky place for that is a
// place that never has it.

/** ~3 MB of image once base64 is decoded. The browser shrinks before sending. */
const MAX_IMAGE_CHARS = 4_000_000;
const MAX_CHARS = 20_000;

/**
 * How long the platform lets this run, said out loud rather than left to
 * whatever a new Vercel project defaults to.
 *
 * A photographed 7A sheet with 43 lessons took 36 seconds to read. If the
 * platform's limit came first, the function would be killed mid-read and the
 * parent would get the host's bare 504 instead of the message below that tells
 * them what to try. So the model call gives up first (READ_TIMEOUT_MS) and
 * the function outlives it by enough to send that answer.
 */
export const maxDuration = 60;
const READ_TIMEOUT_MS = 50_000;
/** A second try is only worth starting while most of the time is still left. */
const RETRY_WITHIN_MS = 15_000;

/**
 * Read without the model deliberating first.
 *
 * `gemini-flash-latest` is an alias, and by 20 Nov 2026 it pointed at a model
 * that thinks before it answers unless told otherwise. On a photographed 7B
 * sheet with 43 lessons that was about 12,000 tokens of thought and 110
 * seconds — against the 50 this route allows — so every dense sheet failed in
 * production, while a short pasted text still came back in 14 and made the
 * route look healthy.
 *
 * With thinking at its lowest the same sheet took 21 seconds, and held up
 * against the photograph at least as well: it got an end time right that the
 * deliberate read got wrong. The one thing it did worse — writing a language
 * block's five lines into a single subject — is now a rule in READ_PROMPT.
 * Which is the comment further down, borne out: a grid is transcription.
 *
 * "low" is the least this model accepts ("minimal" is refused, and a token
 * budget either switched thinking off or was ignored). A model that does not
 * know the setting answers 400 at once, and the read is tried again without
 * it — see below.
 */
const QUICK = { thinkingConfig: { thinkingLevel: "low" } };

export async function POST(req: NextRequest) {
  // No account behind this, so the model is the thing to protect. Six a
  // quarter-hour is generous for a parent with three children and useless to
  // anyone pointing a script at it.
  if (!rateLimit(`read:${clientIp(req)}`, 6, 900_000)) {
    return NextResponse.json(
      { error: "Oj, det blev många avläsningar på kort tid! Vänta en stund (högst 15 minuter) och försök igen." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const image = typeof body.image === "string" ? body.image : "";
  const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);

  if (image && !match) {
    return NextResponse.json({ error: "Den filen kunde vi inte läsa som en bild. Prova ett foto eller en skärmbild." }, { status: 400 });
  }
  if (match && match[2].length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "Bilden är lite för stor. Prova en mindre – eller beskär den så att bara schemat syns." },
      { status: 400 },
    );
  }
  if (!match) {
    if (text.length < 20) {
      return NextResponse.json(
        { error: "Lite för lite att gå på! Ladda upp en bild, eller klistra in text med dagar, tider och ämnen." },
        { status: 400 },
      );
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: "Det var mycket text. Klistra in ett schema i taget (högst 20 000 tecken)." }, { status: 400 });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Avläsningen fungerar inte just nu. Försök igen om en stund." },
      { status: 503 },
    );
  }

  let raw: string;
  try {
    const parts = match
      ? [
          { text: READ_PROMPT + (text ? `\n${text}\n` : "") },
          { inlineData: { mimeType: match[1], data: match[2] } },
        ]
      : [{ text: READ_PROMPT + text }];

    // A grid is transcription, not judgement. Any creativity here shows up
    // as a lesson that isn't on the sheet.
    const plain = { temperature: 0, responseMimeType: "application/json" };

    // One clock for the whole read, however many tries it takes. geminiFetch
    // retries by itself unless told not to, and its retry used to get a fresh
    // 50 seconds: a read that timed out once ran for 100, the platform killed
    // it at 60, and the parent got the host's bare 504 — the exact thing
    // maxDuration above was set to prevent. So the retrying is done here, and
    // every try is given only what is left.
    const started = Date.now();
    const early = () => Date.now() - started < RETRY_WITHIN_MS;
    const ask = (generationConfig: object) =>
      geminiFetch(
        geminiUrl(GEMINI_TEXT_MODEL, apiKey),
        { contents: [{ parts }], generationConfig },
        { timeoutMs: Math.max(1_000, READ_TIMEOUT_MS - (Date.now() - started)), retries: 0 },
      );

    let res: Response;
    try {
      res = await ask({ ...plain, ...QUICK });
    } catch (e) {
      // A connection that failed at once is worth one more go. A read that
      // ran out of time is not: there is no time left to give it.
      if (!early()) throw e;
      res = await ask({ ...plain, ...QUICK });
    }
    if (!res.ok && early()) {
      // 400 this fast is the model refusing the request as written, and the
      // thinking setting is the one part of it a different model might not
      // know. Anything else transient gets the same request again.
      if (res.status === 400) res = await ask(plain);
      else if (res.status === 429 || res.status >= 500) res = await ask({ ...plain, ...QUICK });
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[api/read] Gemini ${res.status} using ${GEMINI_TEXT_MODEL}:`, detail.slice(0, 400));
      return NextResponse.json(
        { error: "Avläsningen strulade till sig. Vänta en liten stund och försök igen." },
        { status: 502 },
      );
    }
    const json = await res.json();
    raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch (e) {
    // Everything that threw here used to be reported as a timeout, which sent
    // people off cropping their photo when the real answer was that this
    // machine could not reach Google at all — a failure that arrives in well
    // under a second. Say which it was, and log the cause either way: the
    // route's own console is the only place the reason survives.
    const timedOut = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
    // The cause, not just the wrapper. Node reports every network failure as
    // "TypeError: fetch failed"; which one it was — ENOTFOUND, ECONNREFUSED,
    // a certificate — lives one level down, and without it the log says
    // nothing a person can act on.
    const c = e instanceof Error ? (e.cause as { code?: string; message?: string } | undefined) : undefined;
    const why = c ? `${c.code ?? ""} ${c.message ?? ""}`.trim() : "no cause";
    console.error(`[api/read] request failed: ${String(e)} | cause: ${why}`);
    return timedOut
      ? NextResponse.json(
          { error: "Det tog för lång tid. Försök igen – det hjälper ofta att beskära bilden så att bara schemat syns." },
          { status: 504 },
        )
      : NextResponse.json(
          { error: "Vi når inte avläsningen just nu. Försök igen om en liten stund." },
          { status: 502 },
        );
  }

  try {
    return NextResponse.json({ schedule: parseSchedule(raw, match ? "photo" : "text") });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ReadError ? e.message : "Vi hittade inget schema här. Se till att dagar, tider och ämnen syns tydligt." },
      { status: 422 },
    );
  }
}
