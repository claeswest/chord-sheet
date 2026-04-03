import { NextRequest, NextResponse } from "next/server";

const PROMPT_SYSTEM = `You are a visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an abstract, atmospheric background image that suits the song's mood and genre.

Rules:
- No text, letters, words, numbers, or sheet music in the image
- Abstract, painterly, or photographic — not literal scene depictions of humans
- Evoke the mood: warm sunset tones for country/folk, deep blues for blues/jazz, neon/dark for rock/metal, soft pastels for pop/ballads, etc.
- Describe textures, colors, light effects, gradients
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

  // Step 1: Ask Gemini Flash to write a visual image prompt
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

  // Step 2: Generate image using Gemini image generation model
  const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
  const imgRes = await fetch(imgUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!imgRes.ok) {
    const err = await imgRes.json().catch(() => ({}));
    console.error("Image generation error:", err);
    const detail = err?.error?.message ?? JSON.stringify(err);
    return NextResponse.json({ error: `Image generation failed: ${detail}` }, { status: 502 });
  }

  const imgData = await imgRes.json();

  // Response parts may include text + image; find the inlineData part
  const parts: any[] = imgData.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);

  if (!imagePart) {
    console.error("No image part in response:", JSON.stringify(imgData).slice(0, 500));
    return NextResponse.json({ error: "No image returned from AI" }, { status: 502 });
  }

  const b64: string = imagePart.inlineData.data;
  const mimeType: string = imagePart.inlineData.mimeType ?? "image/png";

  return NextResponse.json({
    image: `data:${mimeType};base64,${b64}`,
    prompt: imagePrompt,
  });
}
