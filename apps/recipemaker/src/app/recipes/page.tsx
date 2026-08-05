import Link from "next/link";
import { auth } from "@/lib/auth";
import { listRecipes } from "@/lib/recipeDb";
import { PLANS, planFromUser, getRecipeLimit, type Plan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { totalMinutes } from "@/types/recipe";
import NewRecipeButton from "@/components/library/NewRecipeButton";

export const metadata = { title: "Your recipes" };

export default async function RecipesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-nunito)" }}>
          Your recipe book
        </h1>
        <p className="mt-3 text-stone-600">Sign in to see the recipes you&apos;ve saved.</p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const plan = planFromUser(user ?? { plan: "free" }) as Plan;
  const limit = getRecipeLimit(plan);
  const recipes = await listRecipes(session.user.id);
  const atLimit = limit !== null && recipes.length >= limit;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-nunito)" }}>
            Your recipes
          </h1>
          {limit !== null && (
            <p className="mt-1 text-sm text-stone-500">
              {recipes.length} of {limit} · {PLANS[plan].name}
            </p>
          )}
        </div>
        <NewRecipeButton disabled={atLimit} />
      </div>

      {recipes.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-stone-300 p-12 text-center">
          <p className="text-lg font-semibold">Nothing here yet</p>
          <p className="mt-2 text-stone-600">
            Paste a recipe, photograph a handwritten card, or start from scratch.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-stone-100">
          {recipes.map((r) => {
            const total = totalMinutes(r);
            return (
              <li key={r.id} className="py-4">
                <Link href={`/recipes/${r.id}`} className="group flex items-baseline gap-3">
                  <span className="font-semibold group-hover:underline">{r.title}</span>
                  {total != null && <span className="text-sm text-stone-400">{total} min</span>}
                  {r.servings != null && (
                    <span className="text-sm text-stone-400">serves {r.servings}</span>
                  )}
                </Link>
                {r.description && (
                  <p className="mt-1 line-clamp-1 text-sm text-stone-500">{r.description}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {atLimit && (
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          You&apos;ve filled all {limit} free slots. Upgrading lifts the limit and unlocks PDF
          export and sharing.
        </p>
      )}
    </main>
  );
}
