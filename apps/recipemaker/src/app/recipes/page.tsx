import Link from "next/link";
import { auth } from "@/lib/auth";
import { listRecipes } from "@/lib/recipeDb";
import { PLANS, planFromUser, getRecipeLimit, type Plan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { totalMinutes } from "@/types/recipe";
import NewRecipeButton from "@/components/library/NewRecipeButton";
import ImportRecipe from "@/components/library/ImportRecipe";

export const metadata = { title: "Your recipes" };

export default async function RecipesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl font-extrabold">Your recipe book</h1>
        <p className="font-body text-recipe mt-3 text-ink-muted">
          Sign in to see the recipes you&apos;ve saved.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper-raised"
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
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold">Your recipes</h1>
          {limit !== null && (
            <p className="mt-1 text-sm text-ink-faint">
              {recipes.length} of {limit} · {PLANS[plan].name}
            </p>
          )}
        </div>
        <NewRecipeButton disabled={atLimit} />
      </div>

      {/* Import sits above the list: it's the main way recipes get in, and on an
          empty library it's the only thing worth showing. */}
      <div className="mt-8">
        <ImportRecipe disabled={atLimit} />
      </div>

      {recipes.length === 0 ? (
        <p className="font-body mt-8 text-center text-ink-faint">
          Nothing saved yet — paste a recipe above, or start from scratch.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => {
            const total = totalMinutes(r);
            return (
              <li key={r.id}>
                <Link
                  href={`/recipes/${r.id}`}
                  className="group block h-full overflow-hidden rounded-card border border-rule bg-paper-raised shadow-card transition hover:shadow-raise"
                >
                  {r.imageUrl ? (
                    // A data URL — nothing for next/image to optimise.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt="" className="h-28 w-full object-cover" />
                  ) : (
                    <div className="h-28 bg-paper-sunken" />
                  )}
                  <div className="p-4">
                    <h2 className="font-display font-bold group-hover:underline">{r.title}</h2>
                    {r.description && (
                      <p className="font-body mt-1 line-clamp-2 text-sm text-ink-muted">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-3 flex gap-3 text-xs text-ink-faint">
                      {r.servings != null && <span>Serves {r.servings}</span>}
                      {total != null && <span>{total} min</span>}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {atLimit && (
        <p className="mt-8 rounded-xl bg-accent-soft p-4 text-sm text-accent-ink">
          You&apos;ve filled all {limit} free slots.{" "}
          <Link href="/pricing" className="font-semibold underline">
            Upgrading
          </Link>{" "}
          lifts the limit, removes the printed footer credit, and unlocks sharing.
        </p>
      )}
    </main>
  );
}
