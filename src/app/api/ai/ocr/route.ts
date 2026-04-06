import { NextRequest, NextResponse } from "next/server";

const PROMPT = `You are looking at a photo or scan of a chord sheet (handwritten, printed, or photographed from a screen/book/paper).

Your job: read every chord and lyric from the image and reformat it cleanly.

Return EXACTLY this format — no extra text, no markdown:

Title: {song title, or "Unknown" if not found}
Artist: {artist name, or leave blank if not found}

{chord sheet using inline bracket format}

CHORD PLACEMENT — this is the most important part:
Place each [Chord] bracket at the EXACT character position in the lyric where the chord changes — even in the middle of a word or syllable. Think like a musician reading the original sheet.

Good example (chords mid-word where the beat falls):
  [G]Scarbo[Em]rough [C]Fair[D]
  [Am]Are you go[C]ing to [G]Scar[Am]borough [C]Fair

If the image shows chords written above lyrics on separate lines (chord-over-lyric format), convert them to the inline [Chord] bracket format, placing each chord at the correct character position above which it appeared.

CHORD-ONLY LINES — when a line has chords but no lyrics (instrumental break, intro riff, etc.) keep the spacing between chords using actual spaces in the lyric part so positions are preserved:
  [G]   [D]   [Em]   [C]
  [Am]      [F]
Do NOT collapse them all to position 0 like [G][D][Em][C].

SECTION LABELS — put on their own line, no brackets:
  Verse 1
  Chorus
  Bridge
  Intro

RULES:
- Preserve all chord names exactly as written (Am, G7, Cmaj7, D/F#, Bb, F#m, Dsus2, etc.)
- Preserve all lyric words exactly as written
- Include section labels if visible in the image
- If the title or artist is written at the top of the sheet, extract it
- No markdown, no explanations, no extra formatting`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { image } = (await req.json()) as { image: string };
  if (!image) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // Strip data URL prefix to get raw base64 + mime type
  const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Gemini OCR error:", err);
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
