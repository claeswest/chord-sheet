import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecipe } from "@/lib/recipeDb";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { parseStyle } from "@/lib/canvasStyle";
import { logActivity } from "@/lib/activity";
import { revokeShare, shareRecipe } from "@/lib/shareDb";
import { emptyContent, type RecipeContent } from "@/types/recipe";

type Ctx = { params: Promise<{ id: string }> };

// POST   /api/recipes/[id]/share — publish a link (Pro)
// DELETE /api/recipes/[id]/share — withdraw it
//
// Withdrawing is deliberately NOT gated on the plan. Someone whose
// subscription lapsed must still be able to take a public link down; gating
// the off switch behind payment would be indefensible.

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipe = await getRecipe(session.user.id, id);
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const plan = planFromUser(user ?? { plan: "free" }) as Plan;
  if (PLANS[plan].features.sharing !== true) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
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

  const token = await shareRecipe(session.user.id, recipe.id, recipe.title, {
    content,
    style: parseStyle(recipe.style),
    description: recipe.description,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    source: recipe.source,
  });

  await logActivity("recipe_shared", session.user.id, { recipeId: recipe.id, token });

  return NextResponse.json({ token }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const count = await revokeShare(session.user.id, id);
  if (count > 0) {
    await logActivity("recipe_unshared", session.user.id, { recipeId: id });
  }
  return NextResponse.json({ ok: true });
}
