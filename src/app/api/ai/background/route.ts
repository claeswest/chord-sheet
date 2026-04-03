import { NextRequest, NextResponse } from "next/server";

const PROMPT_SYSTEM = `You are a visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an abstract, atmospheric background image that suits the song's mood and genre.

Rules:
- No text, letters, words, numbers, or sheet music in the image
- Abstract, painterly, or photographic — not literal scene depictions of humans
- Evoke the mood: warm sunset tones for country/folk, deep blues for blues/jazz, neon/dark for rock/metal, soft pastels for pop/ballads, etc.
- Say "abstract" or describe textures/colors/light effects
- Keep it purely visual — no references to musicians or people
- End with: "high quality, cinematic lighting, 4k"

Return ONLY the image prompt text, nothing else.`;

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
    title  ? `Title: ${title}`   : "",
    artist ? `Artist: ${artist}` : "",
    lyrics ? `\nLyrics:\n${lyrics.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");

  // Step 1: Ask Gemini Flash to write an image prompt
  const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const textRes = await fetch(textUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PROMPT_SYSTEM}\n\nSong:\n${songContent}` }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
    }),
  });

  if (!textRes.ok) {
    const err = await textRes.json().catch(() => ({}));
    console.error("Gemini prompt generation error:", err);
    return NextResponse.json({ error: "Failed to generate image prompt" }, { status: 502 });
  }

  const textData = await textRes.json();
  const imagePrompt: string = textData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!imagePrompt) {
    return NextResponse.json({ error: "AI returned empty image prompt" }, { status: 502 });
  }

  // Step 2: Call Imagen 3 to generate the image
  const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
  const imgRes = await fetch(imgUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: imagePrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        safetyFilterLevel: "block_only_high",
        personGeneration: "dont_allow",
      },
    }),
  });

  if (!imgRes.ok) {
    const err = await imgRes.json().catch(() => ({}));
    console.error("Imagen error:", err);
    return NextResponse.json({ error: "Image generation failed", detail: err }, { status: 502 });
  }

  const imgData = await imgRes.json();
  const b64: string = imgData.predictions?.[0]?.bytesBase64Encoded ?? "";
  const mimeType: string = imgData.predictions?.[0]?.mimeType ?? "image/png";

  if (!b64) {
    return NextResponse.json({ error: "No image returned from AI" }, { status: 502 });
  }

  return NextResponse.json({
    image: `data:${mimeType};base64,${b64}`,
    prompt: imagePrompt,
  });
}
