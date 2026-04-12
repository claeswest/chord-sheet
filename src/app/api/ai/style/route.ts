import { NextRequest, NextResponse } from "next/server";
import { ALL_FONTS } from "@/lib/songStyle";

// Derived directly from songStyle.ts — always in sync with the actual font list
const AVAILABLE_FONTS = ALL_FONTS.map(f => f.name);
const FONT_STACKS: Record<string, string> = Object.fromEntries(ALL_FONTS.map(f => [f.name, f.stack]));

const PROMPT = `You are a visual designer and music expert. You will receive a song title, artist, and lyrics. Based on the song's mood, genre, era, and emotional feel, design a beautiful typography and color scheme for a chord sheet.

Available fonts: ${AVAILABLE_FONTS.join(", ")}

Return ONLY valid JSON (no markdown, no code fences, no explanation) in this exact structure:
{
  "theme": "1-2 sentences describing the visual theme and why it suits the song",
  "background": "#hexcolor",
  "titleAlign": <"left" or "center" — center suits anthems/ballads, left suits intimate/folk/personal songs>,
  "title": {
    "fontName": "choose the most fitting font from the list above",
    "fontSize": <integer 18–36, pick what suits the song's drama/energy>,
    "color": "#hexcolor",
    "bold": <true or false — bold for powerful/rock/dramatic songs, regular for soft/classical/folk>,
    "italic": <true or false — italic for romantic/lyrical/poetic songs, upright otherwise>
  },
  "artist": {
    "fontName": "choose the most fitting font from the list above",
    "fontSize": <integer 11–16, typically smaller than title>,
    "color": "#hexcolor",
    "bold": <true or false>,
    "italic": <true or false — italic artist name can feel elegant>
  },
  "lyrics": {
    "fontName": "choose the most fitting font from the list above",
    "fontSize": <integer 13–18, readable but sized for the genre's feel>,
    "color": "#hexcolor",
    "bold": <true or false>,
    "italic": <true or false — italic suits introspective/poetic lyrics>
  },
  "chords": {
    "fontName": "choose the most fitting font from the list above",
    "fontSize": <integer 11–15>,
    "color": "#hexcolor",
    "bold": <true or false — usually bold so chords stand out>,
    "italic": <true or false>
  },
  "section": {
    "fontName": "choose the most fitting font from the list above",
    "fontSize": <integer 10–13, section headers are labels so slightly smaller>,
    "color": "#hexcolor — often matches or complements the chord color",
    "bold": <true or false — usually bold for clear section labels>,
    "italic": <true or false>,
    "align": <"left" or "center" — left is standard, center suits theatrical/choral arrangements>,
    "divider": <true or false — true adds a subtle line under section headers; false is cleaner/minimal>
  }
}

Design guidelines:
- ALL fields must be chosen creatively — do not use placeholder or default values
- Choose background and text colors with strong contrast for readability
- The chord color should stand out clearly from the lyric color
- Match the visual mood to the song: folk feels warm/earthy, rock feels bold/dark, love songs feel soft/elegant, classical feels refined, blues feels deep/moody, pop feels clean/bright
- Serif fonts suit classical, folk, country, ballads; monospace suits technical/indie/electronic; sans-serif suits pop/modern; Caveat suits handwritten/folk/personal
- The title font can be expressive and dramatic; lyrics font should prioritize readability
- Vary font sizes meaningfully: a dramatic rock anthem title might be 32px, a delicate folk ballad title might be 20px
- Use bold/italic purposefully: bold adds weight and power, italic adds elegance and motion
- titleAlign: center is the classic choice; left feels more personal and intimate
- section divider: use true for structured songs with many sections, false for minimal/clean aesthetics
- Be creative and make every field reflect the song's character`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { title, artist, lyrics } = await req.json();
  if (!title && !lyrics) {
    return NextResponse.json({ error: "No song content provided" }, { status: 400 });
  }

  const songContent = [
    title ? `Title: ${title}` : "",
    artist ? `Artist: ${artist}` : "",
    lyrics ? `\nLyrics:\n${lyrics}` : "",
  ].filter(Boolean).join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PROMPT}\n\nSong:\n${songContent}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Gemini style error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await res.json();
  let raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown code fences if present
  raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Failed to parse Gemini style JSON:", raw);
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  // Map fontName → fontFamily stack
  const toStyle = (s: any) => ({
    fontFamily: FONT_STACKS[s.fontName] ?? FONT_STACKS["System Mono"],
    fontSize: s.fontSize,
    color: s.color,
    bold: s.bold,
    italic: s.italic,
  });

  const sec = parsed.section ?? parsed.chords;

  return NextResponse.json({
    theme: parsed.theme ?? "",
    style: {
      background:     parsed.background ?? "#ffffff",
      titleAlign:     parsed.titleAlign === "left" ? "left" : "center",
      sectionAlign:   sec?.align === "center" ? "center" : "left",
      sectionDivider: sec?.divider !== false,
      title:   toStyle(parsed.title),
      artist:  toStyle(parsed.artist ?? parsed.lyrics),
      lyrics:  toStyle(parsed.lyrics),
      chords:  toStyle(parsed.chords),
      section: toStyle(sec),
    },
  });
}
