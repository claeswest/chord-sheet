import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TEXT_MODEL, geminiUrl, geminiFetch } from "@clavos/core/ai";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { auth } from "@/lib/auth";
import { getRecipe } from "@/lib/recipeDb";
import { logActivity } from "@/lib/activity";
import { REVIEW_PROMPT, reviewBrief, parseFixes } from "@/lib/reviewRecipe";
import { emptyContent, type RecipeContent } from "@/types/recipe";

// POST /api/ai/review — look over a recipe and propose corrections.
//
// Read-only. It returns suggestions and writes nothing: the recipe changes
// only when a person accepts a suggestion and saves, which is the whole point
// of splitting checking away from importing.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`review:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many checks just now. Give it a minute." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const recipeId = typeof body.recipeId === "string" ? body.recipeId : "";
  if (!recipeId) return NextResponse.json({ error: "recipeId is required." }, { status: 400 });

  const recipe = await getRecipe(session.user.id, recipeId);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Checking isn't configured on this server (GEMINI_API_KEY is unset)." },
      { status: 503 },
    );
  }

  const raw = recipe.content as Partial<RecipeContent> | null;
  const content: RecipeContent = {
    ...emptyContent(),
    ...(raw ?? {}),
    ingredientGroups: raw?.ingredientGroups?.length
      ? raw.ingredientGroups
      : emptyContent().ingredientGroups,
    stepGroups: raw?.stepGroups?.length ? raw.stepGroups : emptyContent().stepGroups,
    notes: raw?.notes ?? [],
  };

  try {
    const res = await geminiFetch(geminiUrl(GEMINI_TEXT_MODEL, apiKey), {
      contents: [
        { parts: [{ text: REVIEW_PROMPT + reviewBrief(content, recipe.title) }] },
      ],
      // Low temperature: this should reach the same conclusion twice about the
      // same recipe. A checker that changes its mind is worse than none.
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[ai/review] Gemini ${res.status}:`, detail.slice(0, 400));
      return NextResponse.json(
        { error: "Couldn't check that right now. Try again in a moment." },
        { status: 502 },
      );
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const fixes = parseFixes(text, content);

    await logActivity("recipe_reviewed", session.user.id, { recipeId, found: fixes.length });
    return NextResponse.json({ fixes });
  } catch {
    return NextResponse.json({ error: "The check timed out. Try again." }, { status: 504 });
  }
}
