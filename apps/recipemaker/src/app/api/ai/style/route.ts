import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TEXT_MODEL, geminiUrl, geminiFetch } from "@clavos/core/ai";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getRecipe, setRecipeStyle } from "@/lib/recipeDb";
import { stripFence } from "@/lib/recipeImport";
import { STYLE_PROMPT, styleBrief, validateStyle } from "@/lib/styleGen";
import { PRESETS } from "@/lib/canvasStyle";
import type { RecipeContent } from "@/types/recipe";

// POST /api/ai/style — give one recipe its own look.
//
// Body: { recipeId, preset? }. With `preset` this just stores one of the
// built-in styles (no model call); without it, the style is generated from
// what the recipe actually is.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const recipeId = typeof body.recipeId === "string" ? body.recipeId : "";
  if (!recipeId) return NextResponse.json({ error: "recipeId is required." }, { status: 400 });

  const recipe = await getRecipe(session.user.id, recipeId);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  // Presets are a plain write — no model, no rate limit, no failure modes.
  if (typeof body.preset === "string") {
    const preset = PRESETS[body.preset];
    if (!preset) return NextResponse.json({ error: "Unknown preset." }, { status: 400 });
    await setRecipeStyle(session.user.id, recipeId, preset);
    return NextResponse.json({ style: preset });
  }

  if (!rateLimit(`style:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many style requests just now. Give it a minute." },
      { status: 429 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI styling isn't configured on this server (GEMINI_API_KEY is unset)." },
      { status: 503 },
    );
  }

  const content = recipe.content as Partial<RecipeContent> | null;
  const ingredients = (content?.ingredientGroups ?? [])
    .flatMap((g) => g.items ?? [])
    .map((i) => i.name)
    .filter(Boolean);

  const brief = styleBrief({
    title: recipe.title,
    description: recipe.description,
    source: recipe.source,
    ingredients,
  });

  // One retry, with the specific failures fed back. A rejected style is
  // almost always one colour short of a contrast threshold, and saying which
  // fixes it far more often than asking again blindly.
  let issues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const correction =
      issues.length > 0
        ? `\n\nYour previous answer was rejected:\n- ${issues.join("\n- ")}\nFix these and keep the rest of the palette.`
        : "";

    const res = await geminiFetch(geminiUrl(GEMINI_TEXT_MODEL, apiKey), {
      contents: [{ parts: [{ text: `${STYLE_PROMPT}${correction}\n\nRecipe:\n${brief}` }] }],
      generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
    }).catch(() => null);

    if (!res || !res.ok) {
      const detail = res ? await res.text().catch(() => "") : "request failed";
      console.error(`[ai/style] Gemini ${res?.status ?? "-"}:`, detail.slice(0, 400));
      return NextResponse.json(
        { error: "The style generator is having trouble right now. Try again in a moment." },
        { status: 502 },
      );
    }

    const json = await res.json();
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFence(raw));
    } catch {
      issues = ["Output was not valid JSON."];
      continue;
    }

    const result = validateStyle(parsed);
    if ("style" in result) {
      await setRecipeStyle(session.user.id, recipeId, result.style);
      await logActivity("recipe_styled", session.user.id, { recipeId, attempt: attempt + 1 });
      return NextResponse.json({ style: result.style });
    }
    issues = result.issues;
  }

  // Two rejected attempts. The existing style is left alone — a recipe you
  // can't read is worse than one that looks like all the others.
  console.warn("[ai/style] rejected twice:", issues.join(" | "));
  return NextResponse.json(
    { error: "Couldn't find a readable palette for this one. Try again, or pick a preset." },
    { status: 422 },
  );
}
