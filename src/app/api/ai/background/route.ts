import { NextRequest, NextResponse } from "next/server";

const STYLE_PROMPTS: Record<string, string> = {
  abstract: `You are a visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an ABSTRACT, PAINTERLY background image that suits the song's mood and genre.
Rules: No text, letters, words, numbers, or sheet music. Abstract shapes, color fields, paint strokes, gradients — no recognisable real-world objects. Evoke the mood through colour and texture. No people, no faces. End with: "abstract art, painterly, high quality, 4k"`,

  dreamy: `You are a dream sequence visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a DREAMY, SOFT-FOCUS background image.
Rules: No text, letters, words, or sheet music. Soft diffused light, gentle gradients, blurred edges, floating particles — like a half-remembered dream. Pastel clouds, soft glows, hazy mist, gentle bokeh. Colours match the song's mood. No people. End with: "dreamy soft focus, ethereal glow, high quality, 4k"`,

  cinematic: `You are a film director of photography. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a CINEMATIC WIDESCREEN background image.
Rules: No text, letters, words, or sheet music. Dramatic wide-angle landscape or cityscape, letterbox aspect, cinematic colour grading — teal and orange, or cool desaturated. Long shadows, lens flare, atmospheric depth. No people. End with: "cinematic widescreen, anamorphic lens, colour graded, high quality, 4k"`,

  watercolor: `You are a watercolor illustrator. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a WATERCOLOR PAINTING background image.
Rules: No text, letters, words, or sheet music. Soft wet-on-wet watercolor washes, blooming pigment edges, delicate paper texture. Colours reflect the song's mood — warm florals for romance, cool washes for melancholy. Loose and impressionistic. No people. End with: "watercolor painting, soft washes, paper texture, high quality"`,

  minimal: `You are a minimalist graphic designer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a MINIMAL, CLEAN background image.
Rules: No text, letters, words, or sheet music. Vast negative space, single subtle element — one horizon line, a gentle gradient, a lone shape. Muted or monochromatic palette. Breathable and simple. No people. End with: "minimalist design, clean composition, subtle, high quality, 4k"`,

  vintage: `You are a retro art director. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a VINTAGE / RETRO TEXTURED background image.
Rules: No text, letters, words, or sheet music. Aged textures: worn paper, vinyl record grain, faded fabric, peeling paint. Sepia, faded yellows, washed-out browns, dusty pinks. Film grain, light leaks, vignette edges, analog warmth. No people. End with: "vintage aesthetic, film grain, retro texture, high quality"`,

  bokeh: `You are a stage lighting artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a BOKEH LIGHTS background image.
Rules: No text, letters, words, or sheet music. Soft out-of-focus light circles — stage lights, fairy lights, city lights seen blurred. Colours match mood: warm gold for ballads, cool blue-purple for melancholy, vivid multi-colour for upbeat. No people. End with: "bokeh photography, soft light, dreamy, high quality, 4k"`,

  dramatic: `You are a theatrical lighting designer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a DRAMATIC, HIGH-CONTRAST background image.
Rules: No text, letters, words, or sheet music. Deep shadows and intense highlights, stark contrast, single powerful light source. Storm clouds, crashing waves, lightning, volcanic glow — whatever suits the song's intensity. Deep blacks, vivid accent colour. No people. End with: "dramatic lighting, high contrast, intense atmosphere, high quality, 4k"`,

  neon: `You are a neon sign artist and urban photographer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a NEON GLOW background image.
Rules: No text, letters, words, or sheet music. Glowing neon tubes, electric colour reflections on wet surfaces, vibrant pinks, blues, greens, purples against dark backgrounds. Night-time urban energy. No people, no readable signs. End with: "neon glow, electric colours, night atmosphere, high quality, 4k"`,

  pastel: `You are a soft-toned illustrator. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a PASTEL, GENTLE background image.
Rules: No text, letters, words, or sheet music. Soft pastel palette — blush pink, mint, lavender, baby blue, cream. Gentle light, delicate textures, airy and sweet. Floral hints, soft gradients, cotton-candy skies. No people. End with: "pastel colours, soft light, gentle aesthetic, high quality"`,

  retro: `You are a 1970s–80s graphic designer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a RETRO GRAPHIC background image.
Rules: No text, letters, words, or sheet music. Bold geometric shapes, sunset gradients (orange-pink-purple), halftone dots, chrome effects, VHS scan lines or cassette tape textures. Warm amber and magenta hues. No people. End with: "retro 80s aesthetic, graphic design, nostalgic, high quality"`,

  geometric: `You are a generative geometry artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a GEOMETRIC PATTERN background image.
Rules: No text, letters, words, or sheet music. Repeating geometric shapes — hexagons, triangles, low-poly facets, Voronoi patterns, sacred geometry. Colours reflect the song's mood. Clean edges, precise, mathematical beauty. No people. End with: "geometric pattern, low-poly art, precision, high quality, 4k"`,

  warm: `You are a golden-hour photographer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a WARM, GOLDEN background image.
Rules: No text, letters, words, or sheet music. Rich golden and amber tones, warm sunlight, soft lens flare, honey glow. Rolling hills, candlelight interiors, autumn leaves, sunset haze. Cosy and inviting. No people. End with: "golden warm light, amber tones, cosy atmosphere, high quality, 4k"`,

  ethereal: `You are a fine art photographer specialising in spiritual imagery. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an ETHEREAL, OTHERWORLDLY background image.
Rules: No text, letters, words, or sheet music. Translucent veils of light, celestial mist, soft luminous whites and pale golds, floating dust particles, sacred geometry hints. Weightless, spiritual, transcendent. No people. End with: "ethereal fine art, luminous mist, otherworldly, high quality, 4k"`,

  bold: `You are a graphic poster designer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a BOLD, STRIKING background image.
Rules: No text, letters, words, or sheet music. High-impact composition, saturated block colours, strong graphic shapes, powerful visual tension. Think bold poster art, primary colours, maximalist energy. No people. End with: "bold graphic design, high saturation, striking composition, high quality, 4k"`,

  anime: `You are a Japanese anime background artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an ANIME-STYLE background image.
Rules: No text, letters, words, or sheet music. Clean anime art style — painted skies with dramatic clouds, cherry blossoms, glowing city rooftops, moonlit water, vibrant colour fields. Cel-shaded look, anime aesthetic. No people or characters. End with: "anime background art, cel-shaded, Japanese animation style, high quality"`,

  ghibli: `You are a Studio Ghibli background painter. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a STUDIO GHIBLI-INSPIRED background image.
Rules: No text, letters, words, or sheet music. Lush painterly landscapes — rolling green hills, magical forests, ocean cliffs, cosy village rooftops, golden wheat fields. Warm natural light, hand-painted texture, dreamy and wondrous. No characters or people. End with: "Studio Ghibli style, hand-painted, lush landscape, magical, high quality"`,

  oilpainting: `You are a classical oil painter. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an OIL PAINTING background image.
Rules: No text, letters, words, or sheet music. Rich classical oil painting — visible brushwork, deep saturated colours, dramatic chiaroscuro lighting, linseed oil texture. Landscape or abstract composition inspired by the song's emotion. Old Masters technique. No people. End with: "classical oil painting, rich brushwork, chiaroscuro, Old Masters style, high quality"`,

  impressionist: `You are an Impressionist painter. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an IMPRESSIONIST PAINTING background image.
Rules: No text, letters, words, or sheet music. Loose, dappled brushstrokes like Monet or Renoir — water lilies, sunlit fields, misty riverbanks, trembling light on surfaces. Soft edges, broken colour, painterly atmosphere. No people. End with: "Impressionist painting, broken brushstrokes, Monet style, dappled light, high quality"`,

  comic: `You are a comic book and pop art illustrator. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a COMIC / POP ART background image.
Rules: No text, letters, words, or speech bubbles. Bold black outlines, Ben-Day dot halftone patterns, primary colour fills, Roy Lichtenstein or Jack Kirby energy. Action lines, graphic panels, bold graphic shapes. No people or characters. End with: "comic book pop art, halftone dots, bold outlines, graphic, high quality"`,

  surreal: `You are a Surrealist painter. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a SURREALIST background image.
Rules: No text, letters, words, or sheet music. Dream logic — impossible landscapes, melting forms, floating objects, infinite staircases, distorted perspectives. Inspired by Dalí, Magritte, or de Chirico. Rich, detailed, uncanny. No people. End with: "surrealist painting, dreamlike, impossible landscape, Dalí inspired, high quality"`,

  cosmic: `You are an astrophotographer and space artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a COSMIC / SPACE background image.
Rules: No text, letters, words, or sheet music. Deep space — swirling nebulae, star clusters, cosmic dust clouds, distant galaxies, aurora borealis. Rich purples, electric blues, rose pinks, gold star light. Infinite scale, awe-inspiring. No people. End with: "cosmic space art, nebula, star field, astrophotography, high quality, 4k"`,

  forest: `You are a nature and forest photographer. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an ENCHANTED FOREST background image.
Rules: No text, letters, words, or sheet music. Ancient forest — shafts of light through tall trees, mossy ground, glowing mushrooms, misty undergrowth, dappled canopy. Magical or serene depending on song mood. No people. End with: "enchanted forest, atmospheric light, nature photography, magical, high quality, 4k"`,

  underwater: `You are an underwater photographer and ocean artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an UNDERWATER background image.
Rules: No text, letters, words, or sheet music. Deep ocean or reef — shimmering light rays through water, bioluminescent creatures, coral gardens, floating particles, deep blue and teal. Ethereal and weightless. No people. End with: "underwater photography, ocean depth, light rays, bioluminescent, high quality, 4k"`,

  cyberpunk: `You are a cyberpunk concept artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a CYBERPUNK background image.
Rules: No text, letters, words, or readable signs. Dystopian neon city — rain-slicked streets, holographic reflections, towering mega-structures, electric pink and cyan neon glow, fog and steam. No people or characters. End with: "cyberpunk city, neon rain, dystopian, high tech atmosphere, high quality, 4k"`,

  fantasy: `You are a fantasy concept artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a FANTASY background image.
Rules: No text, letters, words, or sheet music. Epic fantasy landscape — floating islands, ancient ruins, magical glowing portals, crystal caves, dragon-scale mountains, enchanted sky. Match song mood: dark fantasy or light fairy-tale. No people. End with: "fantasy concept art, magical landscape, epic, high quality, 4k"`,

  inkwash: `You are a Chinese ink wash (sumi-e) artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for an INK WASH background image.
Rules: No text, letters, words, or sheet music. Sumi-e ink wash — minimal brushstrokes, misty mountains, bamboo, flowing water, negative white space. Monochromatic or subtle ink tones. Zen, elegant, ancient. No people. End with: "sumi-e ink wash painting, Chinese brush art, minimal, zen, high quality"`,

  stainedglass: `You are a stained glass artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a STAINED GLASS background image.
Rules: No text, letters, words, or sheet music. Cathedral stained glass — geometric colour panels, black lead lines, jewel-toned reds, blues, golds, greens, light radiating through coloured glass. Abstract or nature-inspired pattern. No people. End with: "stained glass window, jewel tones, lead lines, cathedral light, high quality"`,

  baroque: `You are a Baroque era painter. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a BAROQUE background image.
Rules: No text, letters, words, or sheet music. Baroque grandeur — dramatic drapery, gilded ornament, heavenly light breaking through clouds, rich deep colours, opulent textures. Inspired by Caravaggio, Rubens, Rembrandt. Lush and theatrical. No people. End with: "Baroque painting style, dramatic light, gilded, opulent, Caravaggio inspired, high quality"`,

  lofi: `You are a lo-fi music visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a LO-FI AESTHETIC background image.
Rules: No text, letters, words, or sheet music. Cosy lo-fi atmosphere — warm lamp-lit room, rain on window, record player glow, coffee steam, soft evening light, muted earth tones, gentle film grain. Calm and intimate. No people. End with: "lo-fi aesthetic, cosy atmosphere, warm light, film grain, high quality"`,

  darkacademia: `You are a dark academia visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a DARK ACADEMIA background image.
Rules: No text, letters, words, or sheet music. Moody intellectual atmosphere — candlelit grand piano, leather-bound books, mahogany wood, velvet drapes, aged parchment, ivy-covered stone walls, warm amber candlelight against deep shadows. Rich and brooding. No people. End with: "dark academia aesthetic, candlelit, moody, rich textures, high quality"`,

  jazz: `You are a jazz club photographer and mood artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a JAZZ CLUB background image.
Rules: No text, letters, words, or sheet music. Atmospheric jazz club — deep shadows, single warm spotlight beam, cigarette smoke trails, saxophone silhouette, brick walls, amber and deep blue hues, late-night intimate energy. No people or faces. End with: "jazz club atmosphere, smoky, warm spotlight, deep shadows, high quality, 4k"`,

  vaporwave: `You are a vaporwave and synthwave visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a VAPORWAVE background image.
Rules: No text, letters, words, or sheet music. Retro-futuristic vaporwave aesthetic — pastel pink and purple gradients, neon grid floors, chrome reflections, palm tree silhouettes, glowing sun, soft haze. Nostalgic and dreamy digital world. No people. End with: "vaporwave aesthetic, synthwave, pastel neon, retro-futuristic, high quality"`,

  grunge: `You are a rock and grunge visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a GRUNGE background image.
Rules: No text, letters, words, or sheet music. Raw distressed textures — cracked concrete, peeling paint layers, rust stains, torn fabric, weathered wood, spray paint residue, dark gritty urban surfaces. Muted desaturated tones with one strong accent. No people. End with: "grunge texture, distressed, raw aesthetic, urban decay, high quality"`,

  tropical: `You are a tropical and Latin music visual artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a TROPICAL background image.
Rules: No text, letters, words, or sheet music. Lush tropical atmosphere — golden sunset over ocean, swaying palm silhouettes, vibrant hibiscus flowers, turquoise water, warm dusk light, reggae or bossa nova energy. Vivid and warm. No people. End with: "tropical atmosphere, golden sunset, lush, vibrant colours, high quality, 4k"`,

  doubleexposure: `You are a fine art photographer specialising in double exposure. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a DOUBLE EXPOSURE background image.
Rules: No text, letters, words, or sheet music. Double exposure photography — two overlapping translucent images blended together, e.g. a landscape melting into an abstract pattern, nature silhouettes blended with light leaks. Dreamy and layered. No people or faces. End with: "double exposure photography, blended layers, translucent, fine art, high quality"`,

  glitch: `You are a digital glitch and generative AI artist. Given a song title, artist, and lyrics, write a single concise image generation prompt (max 60 words) for a GLITCH ART background image.
Rules: No text, letters, words, or sheet music. Digital glitch aesthetic — RGB colour channel splits, scan line distortions, corrupted data visuals, pixel displacement, electric interference patterns, neon colour aberrations on dark ground. Abstract and technological. No people. End with: "glitch art, RGB split, digital distortion, generative, high quality"`,
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
