import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/chrome/AppHeader";
import RecipeSample from "@/components/marketing/RecipeSample";
import TryIt from "@/components/marketing/TryIt";
import { LANDING_PAGES, getLandingPage } from "@/data/landingPages";

// One page per search someone actually makes.
//
// This is the catch-all segment, so it sits below every named route and must
// 404 on anything it doesn't recognise — otherwise every typo'd URL becomes a
// soft 200 with a landing page on it, which is both bad for a visitor and the
// fastest way to teach a search engine that the site is noise.

const BASE_URL = "https://recipebookmaker.com";

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

// Only these slugs exist. Without this a request for /anything renders on
// demand rather than 404ing from the static set.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    // Each page is its own canonical. These are close cousins by design, and
    // without this they compete with each other and with the home page.
    alternates: { canonical: `${BASE_URL}/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `${BASE_URL}/${page.slug}`,
    },
  };
}

export default async function LandingPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();

  return (
    <>
      <AppHeader />

      <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 pb-16 pt-8 md:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            {page.h1}
          </h1>
          <p className="font-body measure mt-5 text-lg leading-relaxed text-ink-muted">
            {page.intro}
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
          recipe={page.sample.recipe}
          style={page.sample.style}
          className="rounded-card border border-rule p-8 shadow-raise"
        />
      </section>

      {/* The paste box, high up rather than at the foot. Someone who arrived
          from a search has a recipe in mind already; the fastest way to answer
          their question is to let them use it. */}
      <section className="bg-paper-sunken">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-xs uppercase tracking-[0.14em] text-accent">{page.tryKicker}</p>
          <h2 className="font-display mt-2 text-3xl font-extrabold">{page.tryTitle}</h2>
          <p className="font-body measure mt-4 mb-8 text-lg leading-relaxed text-ink-muted">
            Any recipe you have as text — from a website, a message, an email. No account,
            nothing saved unless you want it.
          </p>
          <TryIt />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {page.points.map(([title, body]) => (
            <div key={title}>
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="font-body mt-2 leading-relaxed text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-paper-sunken">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="font-display text-3xl font-extrabold">Questions</h2>
          <dl className="mt-10 space-y-8">
            {page.faq.map(([q, a]) => (
              <div key={q}>
                <dt className="font-display text-lg font-bold">{q}</dt>
                <dd className="font-body mt-2 leading-relaxed text-ink-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
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

        {/* Cousins, linked. Five orphan pages are five pages a crawler has to
            find some other way; linked, they're a small site. */}
        <nav className="mt-16 border-t border-rule pt-8">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Also</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {LANDING_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className="text-ink-muted hover:text-ink">
                  {p.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </>
  );
}
