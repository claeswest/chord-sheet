import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRecipe } from "@/lib/recipeDb";
import { prisma } from "@/lib/prisma";
import { PLANS, planFromUser, type Plan } from "@/lib/plans";
import { parseStyle } from "@/lib/canvasStyle";
import { emptyContent, type Recipe, type RecipeContent } from "@/types/recipe";
import RecipeView from "@/components/recipe/RecipeView";
import PrintButton from "@/components/recipe/PrintButton";
import StylePicker from "@/components/recipe/StylePicker";

// The cook view: the recipe with nothing else on the page. Also the print
// target — @media print in globals.css hides everything but the article.

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const row = await getRecipe(session.user.id, id);
  if (!row) notFound();

  const raw = row.content as Partial<RecipeContent> | null;
  const content: RecipeContent = {
    ...emptyContent(),
    ...(raw ?? {}),
    ingredientGroups: raw?.ingredientGroups?.length
      ? raw.ingredientGroups
      : emptyContent().ingredientGroups,
    stepGroups: raw?.stepGroups?.length ? raw.stepGroups : emptyContent().stepGroups,
    notes: raw?.notes ?? [],
  };

  const recipe: Recipe = {
    id: row.id,
    title: row.title,
    description: row.description,
    servings: row.servings,
    prepMinutes: row.prepMinutes,
    cookMinutes: row.cookMinutes,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    content,
  };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const plan = planFromUser(user ?? { plan: "free" }) as Plan;
  const clean = PLANS[plan].features.pdfExport === true;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href="/recipes" className="text-sm text-ink-muted hover:text-ink">
          ← All recipes
        </Link>
        <Link
          href={`/recipes/${recipe.id}`}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Edit
        </Link>
        <PrintButton className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised" />
      </div>

      <div className="no-print mb-4">
        <StylePicker recipeId={recipe.id} />
      </div>

      <div className="overflow-hidden rounded-card shadow-card">
        <RecipeView recipe={recipe} style={parseStyle(row.style)} watermark={!clean} />
      </div>

      {/* No upgrade link yet — there is no pricing page until Stripe exists,
          and a dead link is worse than no link. */}
      {!clean && (
        <p className="no-print mt-4 text-center text-sm text-ink-faint">
          Printed copies carry a small recipebookmaker.com credit at the foot.
        </p>
      )}
    </main>
  );
}
