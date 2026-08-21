import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TEXT_MODEL, geminiUrl, geminiFetch } from "@clavos/core/ai";
import { rateLimit, clientIp } from "@clavos/core/rate-limit";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createRecipe, countRecipes, getRecipe } from "@/lib/recipeDb";
import { prisma } from "@/lib/prisma";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { IMPORT_PROMPT, ImportError, parseImported } from "@/lib/recipeImport";
import { fetchRecipeFromUrl, UrlFetchError } from "@/lib/recipeUrl";
import type { RecipeContent } from "@/types/recipe";

// POST /api/ai/import — paste recipe text, get a saved, structured recipe.
//
// This is the feature the landing page promises, so its failure modes are
// user-visible: every error below returns a message worth reading rather than
// a bare 500.

const MAX_CHARS = 20_000;
/** ~3 MB of image once base64 is decoded. The browser shrinks before sending. */
const MAX_IMAGE_CHARS = 4_000_000;

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
  let text = typeof body.text === "string" ? body.text.trim() : "";

  // A link instead of the text. Most recipe sites publish the recipe as
  // structured data, so this usually hands the model a clean recipe rather
  // than a page — see recipeUrl.ts.
  const url = typeof body.url === "string" ? body.url.trim() : "";
  let fetchedSource: string | null = null;
  let fromStructuredData = false;
  if (url) {
    try {
      const fetched = await fetchRecipeFromUrl(url);
      text = fetched.text;
      fetchedSource = fetched.source;
      fromStructuredData = fetched.structured;
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof UrlFetchError
              ? e.message
              : "Couldn't read that page. Paste the text instead.",
        },
        { status: 422 },
      );
    }
  }

  // A photo of a cookbook page or a screenshot works as well as pasted text —
  // it's how most people actually have their recipes.
  const image = typeof body.image === "string" ? body.image : "";
  const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);

  if (image && !match) {
    return NextResponse.json({ error: "That file isn't an image." }, { status: 400 });
  }
  if (match && match[2].length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "That picture is very large. Try a smaller one." },
      { status: 400 },
    );
  }

  if (!match) {
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

  // Importing INTO a recipe that already exists — someone who pressed "New
  // recipe" first and then wanted to paste or photograph one. It fills that
  // recipe rather than creating a second, and doesn't count against the limit,
  // because the slot has already been taken.
  const intoId = typeof body.recipeId === "string" ? body.recipeId : null;
  let into: Awaited<ReturnType<typeof getRecipe>> = null;
  if (intoId) {
    into = await getRecipe(user.id, intoId);
    if (!into) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

    // Only into an empty one. Overwriting a recipe someone has written would
    // be destroying work, and there is no undo here.
    const existing = into.content as Partial<RecipeContent> | null;
    const hasContent =
      (existing?.ingredientGroups ?? []).some((g) => (g.items ?? []).length > 0) ||
      (existing?.stepGroups ?? []).some((g) => (g.items ?? []).length > 0);
    if (hasContent) {
      return NextResponse.json(
        { error: "That recipe already has something in it." },
        { status: 409 },
      );
    }
  }

  // Check the limit BEFORE calling the model — no point paying for a recipe
  // we're about to refuse to save.
  const limit = PLANS[planFromUser(user) as Plan].features.recipeLimit;
  if (!into && typeof limit === "number" && (await countRecipes(user.id)) >= limit) {
    return NextResponse.json({ error: "limit_reached", limit }, { status: 403 });
  }

  let raw: string;
  try {
    // Same prompt either way — the extraction rules don't change because the
    // source is a photograph. Any text typed alongside a picture is kept: it's
    // usually the bit the photo cut off.
    const parts = match
      ? [
          { text: IMPORT_PROMPT + (text ? `\n${text}\n` : "") },
          { inlineData: { mimeType: match[1], data: match[2] } },
        ]
      : [{ text: IMPORT_PROMPT + text }];

    const res = await geminiFetch(
      geminiUrl(GEMINI_TEXT_MODEL, apiKey),
      {
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      },
      // Reading a photograph takes longer than reading pasted text.
      match ? { timeoutMs: 45_000 } : {},
    );
    if (!res.ok) {
      // Log the upstream reason. Without this a retired model reads as a
      // generic "having trouble" and there is nothing to search for — which
      // cost real time the first time it happened.
      const detail = await res.text().catch(() => "");
      console.error(
        `[ai/import] Gemini ${res.status} using model ${GEMINI_TEXT_MODEL}:`,
        detail.slice(0, 400),
      );
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

  const recipe = into
    ? into
    : await createRecipe(user.id, { title: imported.title, content: imported.content });

  // createRecipe only takes title and content; the rest is a follow-up update
  // rather than widening its signature for one caller. When filling an
  // existing recipe, the same update carries the title and content too.
  await prisma.recipe.update({
    where: { id: recipe.id, userId: user.id },
    data: {
      ...(into ? { title: imported.title, content: imported.content as object } : {}),
      description: imported.description,
      servings: imported.servings,
      prepMinutes: imported.prepMinutes,
      cookMinutes: imported.cookMinutes,
      // The link is the truest answer to "where did this come from", but
      // only if the page didn't name something better — a cookbook, a person.
      source: imported.source ?? fetchedSource,
    },
  });

  await logActivity("recipe_imported", user.id, {
    recipeId: recipe.id,
    title: imported.title,
    chars: text.length,
    from: url ? (fromStructuredData ? "url_structured" : "url_page") : match ? "photo" : "text",
  });

  return NextResponse.json({ id: recipe.id, title: imported.title }, { status: 201 });
}
