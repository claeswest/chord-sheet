import Link from "next/link";
import Image from "next/image";
import AppHeader from "@/components/chrome/AppHeader";
import type { Metadata } from "next";
import recipeCard from "@/images/recipe-card.jpg";
import recipeTin from "@/images/recipe-tin.jpg";
import RecipeSample from "@/components/marketing/RecipeSample";
import TryIt from "@/components/marketing/TryIt";
import { HEIRLOOM, NORDIC, BOTANICAL } from "@/lib/canvasStyle";
import { PANCAKES, SOUP, BUNS } from "@/data/sampleRecipes";
import { LANDING_PAGES } from "@/data/landingPages";

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
      {/* The shared header, not a bespoke one. The old landing header had no
          route to /pricing, so a visitor could not find out what it costs
          without signing up and filling the free tier first. */}
      <AppHeader />

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
            cook from — and keep. Build it into your own recipe book, one recipe at a time.
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

          {/* Before and after, side by side.
              The page could already show what a recipe becomes — it could never
              show where one comes from, and that is the half the promise rests
              on. This sat on the sample's corner first, overhanging it for the
              sake of the pairing; it covered two steps of the method. A
              landing page that hides the product to make a point about the
              product has lost the argument. It lives in the column's own empty
              space now, and the pairing still reads across the gap.

              Hidden below 768, where the hero is one column and this would
              come between the button and the recipe. */}
          <Image
            src={recipeCard}
            alt="A handwritten recipe card on a kitchen table"
            placeholder="blur"
            sizes="(min-width: 768px) 15rem, 0px"
            priority
            className="mt-14 hidden w-60 -rotate-6 rounded-md border-4 border-paper-raised shadow-raise md:block"
          />
        </div>

        <RecipeSample
          recipe={PANCAKES}
          style={HEIRLOOM}
          className="rounded-card border border-rule p-8 shadow-raise"
        />
      </section>

      {/* The demo is the argument.
          Everything below this describes what the product does; this lets
          someone find out, with their own recipe, before being asked for
          anything. It sits directly under the hero because that is where the
          claim was just made. */}
      <section className="bg-paper-sunken">
        <Section kicker="Try it now" title="Paste a recipe, see what it becomes">
          <p className="font-body measure -mt-4 mb-8 text-lg leading-relaxed text-ink-muted">
            Any recipe you have as text — from a website, a message, an email.
            No account, nothing saved unless you want it.
          </p>
          <TryIt />
        </Section>
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
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,20rem)_1fr]">
          {/* The tin is the argument. Everyone who has one knows what happens
              to it eventually, and no sentence on this page says that as
              quickly. Hidden on phones, where it would push the four reasons
              below the fold to make room for atmosphere. */}
          <Image
            src={recipeTin}
            alt="An old tin box full of worn, handwritten recipe cards"
            placeholder="blur"
            sizes="(min-width: 768px) 20rem, 0px"
            className="hidden h-full max-h-[26rem] w-full rounded-card object-cover shadow-card md:block"
          />

          <div className="grid gap-8 sm:grid-cols-2">
            {[
              ["Family recipes", "The ones on index cards, in handwriting you recognise. Get them somewhere they won't fade or go missing."],
              ["The weeknight ten", "The recipes you actually cook. Findable in seconds, not buried in a screenshot folder."],
              ["A book worth giving", "Collect them together and you've made something — a recipe book with your name on it."],
              ["Holidays and occasions", "Christmas, midsummer, birthdays. Grouped so next year you're not starting from memory."],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="font-body mt-2 leading-relaxed text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
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
        <div className="mx-auto max-w-5xl px-6 py-10">
          {/* The search pages, linked from the one page that gets crawled
              first. Reachable only from the sitemap, they are five orphans;
              linked, they are a site. */}
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {LANDING_PAGES.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className="text-ink-muted hover:text-ink">
                  {p.h1}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6 text-sm text-ink-faint">
            <span>
              Recipe<span className="text-accent">Book</span>Maker
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
