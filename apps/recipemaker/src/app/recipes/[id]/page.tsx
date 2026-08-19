import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/chrome/AppHeader";
import { auth } from "@/lib/auth";
import { getRecipe } from "@/lib/recipeDb";
import { prisma } from "@/lib/prisma";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { parseStyle } from "@/lib/canvasStyle";
import { emptyContent, type RecipeContent } from "@/types/recipe";
import RecipeEditor, { type EditorRecipe } from "@/components/editor/RecipeEditor";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const recipe = await getRecipe(session.user.id, id);
  if (!recipe) notFound();

  // `content` is Json to Prisma. Fall back rather than crash if an older row
  // predates a shape change — an editor that won't open is worse than one that
  // opens with an empty section.
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

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const canDraw = PLANS[planFromUser(user ?? { plan: "free" }) as Plan].features.aiImages === true;

  const editable: EditorRecipe = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    source: recipe.source,
    content,
  };

  return (
    <>
      <AppHeader />
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 pt-6">
        <Link href="/recipes" className="text-sm text-ink-muted hover:text-ink">
          ← All recipes
        </Link>
        <Link
          href={`/recipes/${recipe.id}/cook`}
          className="ml-auto text-sm font-semibold text-accent hover:underline"
        >
          Cook view →
        </Link>
      </div>
      <RecipeEditor recipe={editable} canDraw={canDraw} style={parseStyle(recipe.style)} />
    </>
  );
}
