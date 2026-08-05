import Link from "next/link";
import type { Metadata } from "next";
import RecipeSample, { HEIRLOOM, NORDIC, BOTANICAL } from "@/components/marketing/RecipeSample";
import { PANCAKES, SOUP, BUNS } from "@/data/sampleRecipes";

// Landing page.
//
// It shows a recipe rather than describing one. The product's whole claim is
// that a recipe should look like something worth keeping, and that is not a
// claim prose can make on its own.

export const metadata: Metadata = {
  title: "RecipeBookMaker — your recipes, beautifully kept",
  description:
    "Write or paste a recipe and get a clean, styled recipe page you'd actually want to keep. Organise them into your own recipe book.",
};

function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-xs uppercase tracking-[0.14em] text-accent">{kicker}</p>
      <h2 className="font-display mt-2 text-3xl font-extrabold">{title}</h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-extrabold">
          Recipe<span className="text-accent">Book</span>Maker
        </span>
        <Link
          href="/login"
          className="rounded-full border border-rule px-5 py-2 text-sm font-semibold hover:border-ink-faint"
        >
          Sign in
        </Link>
      </header>

      {/* Hero — claim on the left, proof on the right. */}
      <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 pb-16 pt-8 md:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Your recipes,
            <br />
            beautifully kept
          </h1>
          <p className="font-body measure mt-5 text-lg leading-relaxed text-ink-muted">
            Write a recipe or paste one in, and get a clean page you&apos;d actually want to
            cook from — and keep. Build it into your own recipe book, one dish at a time.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper-raised"
            >
              Start your recipe book
            </Link>
            <span className="text-sm text-ink-faint">Free to start · No card needed</span>
          </div>
        </div>

        <RecipeSample
          recipe={PANCAKES}
          style={HEIRLOOM}
          className="rounded-card border border-rule p-8 shadow-raise"
        />
      </section>

      <Section kicker="How it works" title="Three steps, then it's yours">
        <ol className="grid gap-8 sm:grid-cols-3">
          {[
            ["Bring the recipe", "Type it out, or paste the text from wherever it lives now — a message, a website, an email from your mother."],
            ["Make it readable", "Ingredients line up, steps get numbered, times sit where you can see them. The structure is done for you."],
            ["Keep it", "It goes in your library, organised how you like. Come back to it in ten years and it still looks right."],
          ].map(([title, body], i) => (
            <li key={title}>
              <span className="font-display flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper-raised">
                {i + 1}
              </span>
              <h3 className="font-display mt-4 text-lg font-bold">{title}</h3>
              <p className="font-body mt-2 leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* The differentiator: every recipe can look like itself. */}
      <section className="bg-paper-sunken">
        <Section kicker="Every recipe, its own look" title="Not one template for everything">
          <p className="font-body measure -mt-4 mb-10 text-lg leading-relaxed text-ink-muted">
            A midweek soup and a Christmas bun shouldn&apos;t look identical. Each recipe gets
            its own colours and type — while ingredients stay lined up and steps stay numbered,
            so it&apos;s still readable with flour on your hands.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <RecipeSample recipe={PANCAKES} style={HEIRLOOM} compact className="rounded-card border border-rule p-6 shadow-card" />
            <RecipeSample recipe={SOUP} style={BOTANICAL} compact className="rounded-card border border-rule p-6 shadow-card" />
            <RecipeSample recipe={BUNS} style={NORDIC} compact className="rounded-card border border-rule p-6 shadow-card" />
          </div>
        </Section>
      </section>

      <Section kicker="What it's for" title="The recipes worth not losing">
        <div className="grid gap-8 sm:grid-cols-2">
          {[
            ["Family recipes", "The ones on index cards, in handwriting you recognise. Get them somewhere they won't fade or go missing."],
            ["The weeknight ten", "The dishes you actually cook. Findable in seconds, not buried in a screenshot folder."],
            ["A book worth giving", "Collect them together and you've made something — a recipe book with your name on it."],
            ["Holidays and occasions", "Christmas, midsummer, birthdays. Grouped so next year you're not starting from memory."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="font-body mt-2 leading-relaxed text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-card border border-rule bg-paper-raised p-12 text-center shadow-card">
          <h2 className="font-display text-3xl font-extrabold">Start with one recipe</h2>
          <p className="font-body mx-auto mt-3 max-w-[42ch] text-lg leading-relaxed text-ink-muted">
            The one you cook most, or the one you&apos;d be sorry to lose. The rest follows.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-full bg-ink px-8 py-3 text-sm font-semibold text-paper-raised"
          >
            Start your recipe book
          </Link>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-ink-faint">
          <span>
            Recipe<span className="text-accent">Book</span>Maker
          </span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </>
  );
}
