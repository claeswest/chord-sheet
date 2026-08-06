import { NextRequest, NextResponse } from "next/server";
import { GEMINI_IMAGE_MODEL, geminiUrl, geminiFetch } from "@clavos/core/ai";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecipe } from "@/lib/recipeDb";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { heroPrompt, stepPrompt } from "@/lib/imagePrompt";
import { logActivity } from "@/lib/activity";
import type { RecipeContent } from "@/types/recipe";

// POST /api/ai/image — draw a picture for a recipe.
//
// Returns the image; it does NOT save it. The raw PNG comes back around 1.8 MB
// and has to be compressed before storage, which needs a canvas — so the
// browser does that and posts the result to /api/recipes/[id]/image. Same
// split as ChordSheetMaker's background images.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The most expensive call in the app, so the tightest limit.
  if (!rateLimit(`image:${clientIp(req)}`, 8, 60_000)) {
    return NextResponse.json(
      { error: "That's a lot of pictures at once. Give it a minute." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const recipeId = typeof body.recipeId === "string" ? body.recipeId : "";
  const kind = body.kind === "step" ? "step" : "hero";
  const stepId = typeof body.stepId === "string" ? body.stepId : null;
  if (!recipeId) return NextResponse.json({ error: "recipeId is required." }, { status: 400 });
  if (kind === "step" && !stepId) {
    return NextResponse.json({ error: "stepId is required for a step picture." }, { status: 400 });
  }

  const recipe = await getRecipe(session.user.id, recipeId);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const plan = planFromUser(user ?? { plan: "free" }) as Plan;
  if (PLANS[plan].features.aiImages !== true) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Picture generation isn't configured on this server (GEMINI_API_KEY is unset)." },
      { status: 503 },
    );
  }

  const content = recipe.content as Partial<RecipeContent> | null;

  let prompt: string;
  if (kind === "hero") {
    const ingredients = (content?.ingredientGroups ?? [])
      .flatMap((g) => g.items ?? [])
      .map((i) => i.name)
      .filter(Boolean);
    prompt = heroPrompt(recipe.title, recipe.description, ingredients);
  } else {
    const steps = (content?.stepGroups ?? []).flatMap((g) => g.items ?? []);
    const index = steps.findIndex((s) => s.id === stepId);
    if (index === -1) {
      return NextResponse.json({ error: "That step is no longer there." }, { status: 404 });
    }
    prompt = stepPrompt(recipe.title, steps[index].text, index + 1);
  }

  try {
    const res = await geminiFetch(
      geminiUrl(GEMINI_IMAGE_MODEL, apiKey),
      { contents: [{ parts: [{ text: prompt }] }] },
      // Images take much longer than text, and a retry means paying twice.
      { timeoutMs: 60_000, retries: 0 },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[ai/image] Gemini ${res.status} using model ${GEMINI_IMAGE_MODEL}:`,
        detail.slice(0, 400),
      );
      return NextResponse.json(
        { error: "The illustrator is having trouble right now. Try again in a moment." },
        { status: 502 },
      );
    }

    const json = await res.json();
    const parts: Array<{ inlineData?: { data: string; mimeType: string } }> =
      json?.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((p) => p.inlineData)?.inlineData;

    if (!image?.data) {
      // The model sometimes answers a picture request with prose, usually when
      // it has declined the prompt. Say so rather than showing a broken image.
      console.error("[ai/image] no image in response for kind:", kind);
      return NextResponse.json(
        { error: "Couldn't draw that one. Try again, or reword the step." },
        { status: 422 },
      );
    }

    await logActivity("recipe_image_generated", session.user.id, { recipeId, kind });

    return NextResponse.json({
      dataUrl: `data:${image.mimeType ?? "image/png"};base64,${image.data}`,
    });
  } catch {
    return NextResponse.json(
      { error: "The illustrator timed out. Try again." },
      { status: 504 },
    );
  }
}
