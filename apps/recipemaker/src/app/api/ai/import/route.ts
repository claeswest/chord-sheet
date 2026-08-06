import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TEXT_MODEL, geminiUrl, geminiFetch } from "@clavos/core/ai";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createRecipe, countRecipes } from "@/lib/recipeDb";
import { prisma } from "@/lib/prisma";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { IMPORT_PROMPT, ImportError, parseImported } from "@/lib/recipeImport";

// POST /api/ai/import — paste recipe text, get a saved, structured recipe.
//
// This is the feature the landing page promises, so its failure modes are
// user-visible: every error below returns a message worth reading rather than
// a bare 500.

const MAX_CHARS = 20_000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // AI calls cost money and are the obvious thing to abuse.
  if (!rateLimit(`import:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many imports just now. Give it a minute." },
      { status: 429 },
    );
  }

  // Validate the request before inspecting the environment: a three-character
  // paste is the caller's problem, and answering it with "the server isn't
  // configured" sends them looking in the wrong place.
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 20) {
    return NextResponse.json(
      { error: "Paste a bit more — that's too short to read as a recipe." },
      { status: 400 },
    );
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: "That's very long. Paste one recipe at a time." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Deliberately explicit: this is a deployment mistake, not a user error.
    return NextResponse.json(
      { error: "AI import isn't configured on this server (GEMINI_API_KEY is unset)." },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check the limit BEFORE calling the model — no point paying for a recipe
  // we're about to refuse to save.
  const limit = PLANS[planFromUser(user) as Plan].features.recipeLimit;
  if (typeof limit === "number" && (await countRecipes(user.id)) >= limit) {
    return NextResponse.json({ error: "limit_reached", limit }, { status: 403 });
  }

  let raw: string;
  try {
    const res = await geminiFetch(geminiUrl(GEMINI_TEXT_MODEL, apiKey), {
      contents: [{ parts: [{ text: IMPORT_PROMPT + text }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "The importer is having trouble right now. Try again in a moment." },
        { status: 502 },
      );
    }
    const json = await res.json();
    raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return NextResponse.json(
      { error: "The importer timed out. Try again, or paste a shorter recipe." },
      { status: 504 },
    );
  }

  let imported;
  try {
    imported = parseImported(raw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ImportError ? e.message : "Couldn't read that as a recipe." },
      { status: 422 },
    );
  }

  const recipe = await createRecipe(user.id, {
    title: imported.title,
    content: imported.content,
  });

  // createRecipe only takes title and content; the rest is a follow-up update
  // rather than widening its signature for one caller.
  await prisma.recipe.update({
    where: { id: recipe.id, userId: user.id },
    data: {
      description: imported.description,
      servings: imported.servings,
      prepMinutes: imported.prepMinutes,
      cookMinutes: imported.cookMinutes,
      source: imported.source,
    },
  });

  await logActivity("recipe_imported", user.id, {
    recipeId: recipe.id,
    title: imported.title,
    chars: text.length,
  });

  return NextResponse.json({ id: recipe.id, title: imported.title }, { status: 201 });
}
