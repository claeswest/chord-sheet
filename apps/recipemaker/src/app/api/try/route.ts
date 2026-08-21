import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TEXT_MODEL, geminiUrl, geminiFetch } from "@clavos/core/ai";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { logActivity } from "@/lib/activity";
import { IMPORT_PROMPT, ImportError, parseImported } from "@/lib/recipeImport";

// POST /api/try — read a pasted recipe for somebody with no account.
//
// The landing page promises that a pasted recipe comes back as a page worth
// keeping. Until now you had to create an account to find out whether that was
// true, which is the wrong way round: the demo IS the argument.
//
// It saves nothing. The parsed recipe goes back to the browser and stays
// there until someone signs in and claims it (see /api/recipes/claim).
//
// Text only, deliberately. Photographs cost more, take longer and are the
// obvious thing to point a script at; someone who wants that can sign up,
// which by then they have a reason to do.

const MAX_CHARS = 20_000;

export async function POST(req: NextRequest) {
  // Tighter than the signed-in importer, because there is no account behind
  // it: four attempts per ten minutes is plenty for a person trying the thing
  // out, and far too few to be worth pointing a script at. The model is the
  // cost here, not the request.
  if (!rateLimit(`try:${clientIp(req)}`, 4, 600_000)) {
    return NextResponse.json(
      { error: "That's a few tries in a row. Give it a minute, or make a free account." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (text.length < 20) {
    return NextResponse.json(
      { error: "Paste a bit more — that's too short to read as a recipe." },
      { status: 400 },
    );
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: "That's very long. Paste one recipe at a time." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI import isn't configured on this server (GEMINI_API_KEY is unset)." },
      { status: 503 },
    );
  }

  let raw: string;
  try {
    const res = await geminiFetch(geminiUrl(GEMINI_TEXT_MODEL, apiKey), {
      contents: [{ parts: [{ text: IMPORT_PROMPT + text }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[api/try] Gemini ${res.status} using model ${GEMINI_TEXT_MODEL}:`,
        detail.slice(0, 400),
      );
      return NextResponse.json(
        { error: "The importer is having trouble right now. Try again in a moment." },
        { status: 502 },
      );
    }
    const json = await res.json();
    raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return NextResponse.json(
      { error: "The importer timed out. Try again, or paste a shorter recipe." },
      { status: 504 },
    );
  }

  let imported;
  try {
    imported = parseImported(raw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ImportError ? e.message : "Couldn't read that as a recipe." },
      { status: 422 },
    );
  }

  // Logged with no user, which the activity log already allows. Without this
  // the most interesting number in the funnel — how many people try it and
  // never sign up — stays invisible, which is the mistake this whole route
  // exists to stop repeating.
  await logActivity("tried_import", null, { chars: text.length, title: imported.title });

  return NextResponse.json({ imported });
}
