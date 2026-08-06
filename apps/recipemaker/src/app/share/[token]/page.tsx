import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getShare } from "@/lib/shareDb";
import { DEFAULT_STYLE, parseStyle } from "@/lib/canvasStyle";
import { emptyContent, type Recipe, type RecipeContent } from "@/types/recipe";
import RecipeView from "@/components/recipe/RecipeView";
import PrintButton from "@/components/recipe/PrintButton";

type Ctx = { params: Promise<{ token: string }> };

// /share/[token] — a recipe someone sent you. No account needed.
//
// The snapshot is stored as JSON, so everything below treats it as untrusted
// shape rather than trusting what was written months ago by an older version.

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { token } = await params;
  const share = await getShare(token);
  if (!share) return { title: "Recipe not found" };
  return {
    title: share.title,
    description: `A recipe shared from RecipeBookMaker.`,
    // A shared link is meant to be passed on, but it shouldn't accumulate in
    // search results — the person who shared it chose one recipient, not the
    // whole web.
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: Ctx) {
  const { token } = await params;
  const [share, session] = await Promise.all([getShare(token), auth()]);
  if (!share) notFound();

  const snap = (share.content ?? {}) as Record<string, unknown>;
  const raw = snap.content as Partial<RecipeContent> | undefined;
  const content: RecipeContent = {
    ...emptyContent(),
    ...(raw ?? {}),
    ingredientGroups: raw?.ingredientGroups?.length
      ? raw.ingredientGroups
      : emptyContent().ingredientGroups,
    stepGroups: raw?.stepGroups?.length ? raw.stepGroups : emptyContent().stepGroups,
    notes: raw?.notes ?? [],
  };

  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);

  const recipe: Recipe = {
    id: share.id,
    title: share.title,
    description: str(snap.description),
    servings: num(snap.servings),
    prepMinutes: num(snap.prepMinutes),
    cookMinutes: num(snap.cookMinutes),
    source: str(snap.source),
    createdAt: share.createdAt,
    updatedAt: share.createdAt,
    content,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href="/" className="font-display text-sm font-bold">
          RecipeBookMaker
        </Link>
        <PrintButton className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised" />
      </div>

      <div className="overflow-hidden rounded-card shadow-card">
        {/* No watermark here. The recipient isn't the customer, and stamping
            someone else's shared recipe to advertise at them is the wrong
            trade — the sign-up prompt below does that job honestly. */}
        <RecipeView recipe={recipe} style={snap.style ? parseStyle(snap.style) : DEFAULT_STYLE} />
      </div>

      {!session?.user && (
        <p className="no-print font-body mt-8 text-center text-sm text-ink-muted">
          Keep your own recipes like this —{" "}
          <Link href="/login" className="text-accent underline">
            start free
          </Link>
          . Ten recipes, no card.
        </p>
      )}
    </main>
  );
}
