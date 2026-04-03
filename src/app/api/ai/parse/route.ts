import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a chord sheet formatter. The user has pasted raw text copied from a chord website (like Ultimate Guitar, Chordify, Chordu, etc.). This text may contain website navigation, ads, user comments, guitar tabs, chord diagram boxes, and other junk.

Your job: extract the song title, artist, and chord sheet — then reformat it cleanly.

Return EXACTLY this format — no extra text, no markdown:

Title: {song title, or "Unknown" if not found}
Artist: {artist name, or leave blank if not found}

{chord sheet content using inline bracket format}

CHORD FORMAT — use inline brackets to place each chord exactly where it falls on the syllable:
  [Am]Hello [G]darkness, my [C]old friend
  [Em]I've [Am]come to [G]talk with you again

  [Chorus]
  [C]The [G]sound of [Am]silence

RULES:
- Place each chord directly before the syllable it falls on, like [Am]hel-lo
- Use section labels on their own line: Verse 1, Chorus, Bridge, Intro, Outro, etc.
- Remove guitar tabs (lines like e|--0--2--|), chord diagrams, and all website junk
- Remove ads, navigation, user comments, ratings, and licensing text
- Do not modify chord names (Am, G7, Cmaj7, D/F#, etc.) or lyrics
- Do not add any explanation or markdown formatting
- Empty lines between sections are fine`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nRaw text to clean:\n\n${text}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Gemini API error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await res.json();
  const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse "Title:" and "Artist:" from the first few lines
  const rawLines = raw.split(/\r?\n/);
  let title = "";
  let artist = "";
  let contentStart = 0;

  for (let i = 0; i < Math.min(6, rawLines.length); i++) {
    const line = rawLines[i];
    if (!title && line.startsWith("Title:")) {
      title = line.slice(6).trim();
      contentStart = i + 1;
    } else if (!artist && line.startsWith("Artist:")) {
      artist = line.slice(7).trim();
      contentStart = i + 1;
    }
  }

  const cleanedText = rawLines.slice(contentStart).join("\n").trim();

  return NextResponse.json({ title, artist, text: cleanedText });
}
