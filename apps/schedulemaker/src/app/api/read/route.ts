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

export async function POST(req: NextRequest) {
  // No account behind this, so the model is the thing to protect. Six a
  // quarter-hour is generous for a parent with three children and useless to
  // anyone pointing a script at it.
  if (!rateLimit(`read:${clientIp(req)}`, 6, 900_000)) {
    return NextResponse.json(
      { error: "Du har gjort flera avläsningar på kort tid. Vänta upp till 15 minuter och försök igen." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const image = typeof body.image === "string" ? body.image : "";
  const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);

  if (image && !match) {
    return NextResponse.json({ error: "Filen kunde inte läsas som en bild. Välj ett foto eller en skärmbild." }, { status: 400 });
  }
  if (match && match[2].length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "Bilden är för stor. Prova en mindre bild eller beskär den till själva schemat." },
      { status: 400 },
    );
  }
  if (!match) {
    if (text.length < 20) {
      return NextResponse.json(
        { error: "Ladda upp en bild eller klistra in minst 20 tecken med dagar, tider och ämnen." },
        { status: 400 },
      );
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: "Texten är för lång. Klistra in ett schema i taget, högst 20 000 tecken." }, { status: 400 });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Avläsningen är inte tillgänglig just nu. Försök igen senare." },
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

    const res = await geminiFetch(
      geminiUrl(GEMINI_TEXT_MODEL, apiKey),
      {
        contents: [{ parts }],
        // A grid is transcription, not judgement. Any creativity here shows up
        // as a lesson that isn't on the sheet.
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      },
      // Reading a dense grid takes longer than reading prose.
      { timeoutMs: READ_TIMEOUT_MS },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[api/read] Gemini ${res.status} using ${GEMINI_TEXT_MODEL}:`, detail.slice(0, 400));
      return NextResponse.json(
        { error: "Avläsningen misslyckades. Vänta en stund och försök igen." },
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
          { error: "Avläsningen tog för lång tid. Försök igen. Om du använder en bild kan du beskära den till själva schemat." },
          { status: 504 },
        )
      : NextResponse.json(
          { error: "Kunde inte nå avläsningen just nu. Försök igen om en stund." },
          { status: 502 },
        );
  }

  try {
    return NextResponse.json({ schedule: parseSchedule(raw, match ? "photo" : "text") });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ReadError ? e.message : "Kunde inte läsa underlaget som ett schema. Kontrollera att dagar, tider och ämnen finns med." },
      { status: 422 },
    );
  }
}
