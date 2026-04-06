import { NextRequest, NextResponse } from "next/server";

const PROMPT = `You are an expert musician and chord transcriber with deep knowledge of popular songs across all genres and eras.

The user wants a chord sheet for a specific song. Transcribe it from memory as accurately as you can.

Return EXACTLY this format — no extra text, no markdown:

Title: {full song title}
Artist: {artist / band name}

{chord sheet using inline bracket format}

CHORD PLACEMENT — this is the most important part:
Place each [Chord] bracket at the EXACT character position in the lyric where the chord changes — even in the middle of a word or syllable. Think like a musician reading the original sheet.

Good example (chords mid-word where the beat falls):
  [G]Scarbo[Em]rough [C]Fair[D]
  [Am]Are you go[C]ing to [G]Scar[Am]borough [C]Fair

CHORD-ONLY LINES — for instrumental sections or lines with no lyrics, preserve spacing between chords:
  [G]   [D]   [Em]   [C]

SECTION LABELS — put on their own line, no brackets:
  Verse 1
  Chorus
  Bridge
  Intro
  Outro

RULES:
- Include all major sections (intro, verses, choruses, bridge, outro if applicable)
- Use standard chord notation: Am, G7, Cmaj7, D/F#, Bb, F#m, Dsus2, etc.
- If the song has a capo, note it on the first line as: Capo {fret}
- If you are not confident about a song or it is very obscure, say so in a note at the top but still do your best
- No markdown, no explanations, no extra text outside the format above`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { query } = (await req.json()) as { query: string };
  if (!query?.trim()) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PROMPT}\n\nSong request: ${query.trim()}` }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Gemini search error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await res.json();
  const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse Title / Artist from first few lines (same logic as /api/ai/parse)
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
