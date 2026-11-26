import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getAdminRecipe } from "@/lib/adminData";
import { ago, day } from "@/lib/adminFormat";
import { parseStyle } from "@/lib/canvasStyle";
import { contentFromJson, type Recipe } from "@/types/recipe";
import RecipeView from "@/components/recipe/RecipeView";

// A customer's recipe, for reading.
//
// It is drawn by RecipeView, the same component as their cook view and their
// share links, in the style they chose — so this is what they see, not a dump
// of the row. RecipeView has no controls of its own and none are passed in:
// there is no editor here, no share button and no print button, and nothing
// on this page writes to the database.

export const metadata = {
  title: "Admin · recipe",
  // Belt and braces: the page is a 404 to anyone but an admin, and it still
  // should never be something a crawler is invited to keep.
  robots: { index: false, follow: false },
};

export default async function AdminRecipePage({
  params,
}: {
  params: Promise<{ id: string; recipeId: string }>;
}) {
  await requireAdmin();

  const { id, recipeId } = await params;
  const row = await getAdminRecipe(id, recipeId);
  if (!row) notFound();

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
    content: contentFromJson(row.content),
  };

  const owner = row.user.name || row.user.email;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mt-6 text-sm">
        <Link href={`/admin/users/${id}`} className="text-ink-muted hover:text-ink">
          ← {owner}
        </Link>
      </p>

      <p className="mt-3 mb-4 text-xs text-ink-faint">
        {owner}’s recipe, read-only · made {day(row.createdAt)} · edited {ago(row.updatedAt)}
      </p>

      <div className="overflow-hidden rounded-card shadow-card">
        <RecipeView recipe={recipe} style={parseStyle(row.style)} />
      </div>
    </div>
  );
}
