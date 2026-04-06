import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  abstract: `You are a visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an ABSTRACT, PAINTERLY background image that suits the song's mood and genre.

Rules:
- No text, letters, words, numbers, or sheet music
- Abstract shapes, color fields, paint strokes, gradients — no recognisable real-world objects
- Evoke the mood through colour and texture: warm for folk/country, deep blues for jazz/blues, neon for rock/metal, soft pastels for pop/ballads
- Describe textures, brush strokes, color palettes, light effects
- No people, no faces, no musicians
- End with: "abstract art, painterly, high quality, 4k"`,

  landscape: `You are a landscape photographer and visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a SCENIC NATURE LANDSCAPE background image that suits the song's mood and origin.

Rules:
- No text, letters, words, or sheet music
- Real landscape: mountains, forests, ocean, fields, sky, desert, fjords — pick what fits the song's genre and mood
- Match geography to genre: Nordic folk → misty fjords, country → golden plains, reggae → tropical coast, rock → dramatic cliffs
- Cinematic wide shot, golden hour or dramatic natural light
- No people in the image
- End with: "landscape photography, cinematic, golden hour, high quality, 4k"`,

  dark: `You are a lighting director and visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a DARK AND MOODY background image that suits the song's atmosphere.

Rules:
- No text, letters, words, or sheet music
- Deep blacks, dramatic shadows, single or few light sources — spotlight, neon glow, ember, candlelight
- Atmospheric: smoke haze, fog, rain-slicked surfaces, velvet darkness
- Colours: deep purples, midnight blues, charcoal, with one accent colour matching the mood
- No people
- End with: "dark moody atmosphere, dramatic lighting, cinematic, high quality, 4k"`,

  vintage: `You are a retro art director. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a VINTAGE / RETRO TEXTURED background image that suits the song.

Rules:
- No text, letters, words, or sheet music
- Aged textures: worn paper, cracked leather, faded fabric, vinyl record grain, peeling paint, wood grain
- Colour palette: sepia, faded yellows, washed-out browns, dusty pinks, muted greens — like an old photograph
- Film grain, light leaks, vignette edges, analog warmth
- No people
- End with: "vintage aesthetic, film grain, retro texture, high quality"`,

  bokeh: `You are a stage lighting artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a BOKEH LIGHTS background image that suits the song's mood.

Rules:
- No text, letters, words, or sheet music
- Soft, out-of-focus light circles (bokeh) — like stage lights, fairy lights, or city lights seen blurred
- Choose colours that match the mood: warm gold/amber for ballads, cool blue/purple for melancholic songs, vivid multi-colour for upbeat tracks
- Dreamy, ethereal, soft depth of field
- No people, no sharp objects
- End with: "bokeh photography, soft light, dreamy, high quality, 4k"`,

  performance: `You are a concert photographer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a LIVE PERFORMANCE / CONCERT background image that suits the song's genre and energy.

Rules:
- No text, letters, words, or sheet music
- Concert photography: musicians on stage, crowd with raised hands, close-ups of guitar strings or piano keys, microphone silhouettes, spotlight beams
- Match energy: acoustic folk → intimate small venue, rock → arena with pyrotechnics, jazz → smoky club, pop → colourful stage show
- People and musicians ARE allowed and encouraged
- End with: "concert photography, live performance, dramatic stage lighting, high quality, 4k"`,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const { title, artist, lyrics, bgStyle = "abstract" } = await req.json();
  if (!title && !lyrics) {
    return NextResponse.json({ error: "No song content provided" }, { status: 400 });
  }

  const promptSystem = STYLE_PROMPTS[bgStyle] ?? STYLE_PROMPTS.abstract;

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
      contents: [{ parts: [{ text: `${promptSystem}\n\nSong:\n${songContent}` }] }],
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
  const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
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
