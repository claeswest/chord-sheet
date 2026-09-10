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

export async function POST(req: NextRequest) {
  // No account behind this, so the model is the thing to protect. Six a
  // quarter-hour is generous for a parent with three children and useless to
  // anyone pointing a script at it.
  if (!rateLimit(`read:${clientIp(req)}`, 6, 900_000)) {
    return NextResponse.json(
      { error: "That's a few in a row. Give it a minute." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const image = typeof body.image === "string" ? body.image : "";
  const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);

  if (image && !match) {
    return NextResponse.json({ error: "That file isn't an image." }, { status: 400 });
  }
  if (match && match[2].length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "That picture is very large. Try a smaller one." },
      { status: 400 },
    );
  }
  if (!match) {
    if (text.length < 20) {
      return NextResponse.json(
        { error: "Photograph the timetable, or paste it as text." },
        { status: 400 },
      );
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: "That's very long — one timetable at a time." }, { status: 400 });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Reading isn't configured on this server (GEMINI_API_KEY is unset)." },
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
      { timeoutMs: 60_000 },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[api/read] Gemini ${res.status} using ${GEMINI_TEXT_MODEL}:`, detail.slice(0, 400));
      return NextResponse.json(
        { error: "The reader is having trouble right now. Try again in a moment." },
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
          { error: "The reader timed out. Try again, or crop the photo to the grid." },
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
      { error: e instanceof ReadError ? e.message : "Couldn't read that as a timetable." },
      { status: 422 },
    );
  }
}
