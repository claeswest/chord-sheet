import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRecipe, countRecipes } from "@/lib/recipeDb";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { ImportError, parseImported } from "@/lib/recipeImport";
import { logActivity } from "@/lib/activity";

// POST /api/recipes/claim — save the recipe someone read before signing in.
//
// The payload has been sitting in a browser since before there was a session,
// so it is treated as hostile input, not as something we produced. It goes
// back through parseImported, the same validation the model's own output gets:
// every id is regenerated, every field coerced, anything unrecognised dropped.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = PLANS[planFromUser(user) as Plan].features.recipeLimit;
  if (typeof limit === "number" && (await countRecipes(user.id)) >= limit) {
    return NextResponse.json({ error: "limit_reached", limit }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  let imported;
  try {
    // Round-tripping through JSON rather than trusting the object: it forces
    // the same path the model's reply takes, so there is one validator to get
    // right instead of two.
    //
    // Flattened first, and this is not cosmetic. parseImported reads
    // ingredientGroups and stepGroups at the top level — the shape the model
    // replies in — but returns them nested under `content`. Feeding it its own
    // output finds neither, and it throws "couldn't find ingredients or steps"
    // on a perfectly good recipe. Which it did, until this line existed.
    const raw = (body.imported ?? {}) as Record<string, unknown>;
    const content = (raw.content ?? {}) as Record<string, unknown>;
    imported = parseImported(JSON.stringify({ ...raw, ...content }));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ImportError ? e.message : "That didn't look like a recipe." },
      { status: 422 },
    );
  }

  const recipe = await createRecipe(user.id, {
    title: imported.title,
    content: imported.content,
  });
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

  // Its own event type, not "recipe_imported": this is the one that says the
  // try-before-signup path produced an account with something already in it.
  await logActivity("claimed_try", user.id, { recipeId: recipe.id, title: imported.title });

  return NextResponse.json({ id: recipe.id }, { status: 201 });
}
