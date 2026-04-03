import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert chord sheet formatter and musician. The user has pasted raw text from a chord website (Ultimate Guitar, Chordify, Chordu, etc.) that may contain ads, navigation, tabs, chord diagrams, and other junk.

Your job: extract the song, clean the junk, and reformat with precise chord placement.

Return EXACTLY this format — no extra text, no markdown:

Title: {song title, or "Unknown" if not found}
Artist: {artist name, or leave blank if not found}

{chord sheet using inline bracket format}

CHORD PLACEMENT — this is the most important part:
Place each [Chord] bracket at the EXACT character position in the lyric where the chord changes — even in the middle of a word or syllable. Think like a musician reading the original sheet.

Good example (chords mid-word where the beat falls):
  [G]Scarbo[Em]rough [C]Fair[D]
  [Am]Are you go[C]ing to [G]Scar[Am]borough [C]Fair

Bad example (chords only at word starts — too imprecise):
  [G]Scarborough [Em]Fair
  [Am]Are you going [C]to [G]Scarborough [Am]Fair

More examples of correct mid-word placement:
  [D]Long a[G]go and [D]far a[A]way
  [C]Yes-ter[Am]day, all my [F]troub[G]les seemed so [C]far a[G]way

SECTION LABELS — put on their own line, no brackets:
  Verse 1
  Chorus
  Bridge
  Intro

CLEANUP RULES:
- Remove guitar tabs (e|--0--2--|), chord diagrams, website UI, ads, comments, ratings
- Do not change chord names (Am, G7, Cmaj7, D/F#, Bb, etc.) or any lyric words
- No markdown, no explanations, no extra formatting
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
