import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRecipe } from "@/lib/recipeDb";
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
      <div className="mx-auto max-w-3xl px-6 pt-6">
        <Link href="/recipes" className="text-sm text-ink-muted hover:text-ink">
          ← All recipes
        </Link>
      </div>
      <RecipeEditor recipe={editable} />
    </>
  );
}
