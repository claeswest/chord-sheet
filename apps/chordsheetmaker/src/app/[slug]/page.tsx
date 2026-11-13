import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ScrollToTop from "@/components/ui/ScrollToTop";
import CtaLink from "@/components/ui/CtaLink";
import HeroDemo from "@/components/ui/HeroDemo";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { BTN_INK, BTN_PAPER, CHART_LEADING, ChordedLine, Eyebrow, H2 } from "@/components/landing/kit";
import { LANDING_PAGES, LANDING_SLUGS, getLandingPage } from "@/data/landingPages";

const BASE_URL = "https://chordsheetmaker.ai";

// Only the slugs we define render — everything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_SLUGS.map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `${BASE_URL}/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `${BASE_URL}/${page.slug}`,
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();

  const pageUrl = `${BASE_URL}/${page.slug}`;
  const relatedPages = LANDING_PAGES.filter((p) => p.slug !== page.slug).slice(0, 3);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ChordSheetMaker",
      url: pageUrl,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description: page.metaDescription,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan — no credit card required",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className={`${LANDING_FONTS} flex flex-col min-h-full bg-paper text-ink`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-rule">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-4 max-w-6xl mx-auto w-full">
          <Link href="/" aria-label="ChordSheetMaker — home" className="text-lg sm:text-xl font-extrabold tracking-tight text-ink whitespace-nowrap" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-chord">Maker</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-7 text-sm text-stone-600">
            <Link href="/#features" className="hover:text-ink transition-colors hidden sm:block">Features</Link>
            <Link href="/pricing" className="hover:text-ink transition-colors hidden sm:block">Pricing</Link>
            <Link href="/login" className="hover:text-ink transition-colors whitespace-nowrap py-2">Sign in</Link>
            <CtaLink from={page.slug} href="/songs?welcome=1" className={`${BTN_INK} px-4 py-2 text-sm`}>
              Try it free <span aria-hidden>→</span>
            </CtaLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero — the promise on the left, a real chart playing on the right ── */}
        <section className="border-b border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 lg:pt-20 pb-12 sm:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-10 lg:gap-16 items-center">
            <div>
              <Eyebrow className="mb-6 sm:mb-8">{page.eyebrow}</Eyebrow>

              {/* Two phrases, set like two lines on a chart. */}
              <h1 className={`font-display font-medium text-[2.4rem] sm:text-[3.25rem] lg:text-[3.6rem] ${CHART_LEADING} tracking-[-0.02em] text-ink mb-5 sm:mb-6`}>
                <ChordedLine text={page.h1} chords={["G", "D"]} />{" "}
                <em><ChordedLine text={page.h1Accent} chords={["Em", "C"]} /></em>
              </h1>

              <p className="text-lg sm:text-xl text-stone-600 max-w-xl mb-8 leading-relaxed">
                {page.intro}
              </p>

              <CtaLink from={page.slug} href="/songs?welcome=1" className={`${BTN_INK} px-7 py-3.5 text-base w-full sm:w-auto`}>
                Try it free <span aria-hidden>→</span>
              </CtaLink>
              <p className="mt-4 text-sm text-stone-500">No credit card required · Free forever plan available</p>

              {/* Trust signals */}
              <ul className="mt-8 pt-6 border-t border-rule grid grid-cols-2 gap-x-6 gap-y-2.5 max-w-md text-sm text-stone-600">
                {["AI finds the chords", "Works on any device", "Export to PDF", "Free forever plan"].map((t) => (
                  <li key={t} className="flex items-baseline gap-2.5">
                    <span aria-hidden className="font-semibold text-chord">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <figure className="w-full max-w-md mx-auto lg:max-w-none">
              <HeroDemo />
              <figcaption className="mt-3 font-mono text-[11px] leading-relaxed text-stone-500">
                A real chart in play mode — it scrolls by itself while you play
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── Examples ─────────────────────────────────────────────────────── */}
        <section className="bg-paper-deep border-b border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            <Eyebrow className="mb-4">Examples</Eyebrow>
            <h2 className={`${H2} mb-3`}>See what you can create</h2>
            <p className="text-lg text-stone-600 mb-10 sm:mb-14 max-w-xl leading-relaxed">
              Real chord sheets made with ChordSheetMaker — backgrounds, fonts and colours all customised with AI.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8">
              {[
                { src: "/example1.png", title: "Hotel California", artist: "Eagles" },
                { src: "/example2.png", title: "Perfect", artist: "Ed Sheeran" },
              ].map((ex) => (
                <figure key={ex.title}>
                  <div
                    className="relative overflow-hidden rounded-lg border border-ink/15 bg-stone-100"
                    style={{ aspectRatio: "16 / 10", boxShadow: "0 22px 40px -26px rgba(28,25,23,0.45)" }}
                  >
                    <Image
                      src={ex.src}
                      alt={`${ex.title} by ${ex.artist} — example chord sheet`}
                      fill
                      sizes="(max-width: 768px) 100vw, 560px"
                      className="object-cover object-top"
                    />
                  </div>
                  <figcaption className="pt-4">
                    <p className="font-display text-xl leading-snug text-ink">{ex.title}</p>
                    <p className="text-sm text-stone-600">{ex.artist}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sections — heading in the margin, the text beside it ─────────── */}
        <section>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            {page.sections.map((sec, i) => (
              <div
                key={sec.heading}
                className={`grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 lg:gap-16 border-t border-rule py-8 sm:py-10 ${i === 0 ? "border-t-ink" : ""}`}
              >
                <h2 className="font-display font-medium text-2xl sm:text-3xl tracking-[-0.01em] leading-tight text-ink text-balance">
                  {sec.heading}
                </h2>
                <p className="text-stone-600 leading-relaxed text-base sm:text-lg">
                  {sec.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="bg-paper-deep border-y border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24 grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-8 lg:gap-16">
            <div>
              <Eyebrow className="mb-4">FAQ</Eyebrow>
              <h2 className={H2}>Frequently asked questions</h2>
            </div>
            <div className="border-b border-ink/15">
              {page.faqs.map((f) => (
                <details key={f.q} className="group border-t border-ink/15">
                  <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <h3 className="text-base sm:text-lg font-semibold text-ink">
                      {f.q}
                    </h3>
                    <svg
                      className="w-4 h-4 shrink-0 text-stone-500 transition-transform duration-200 group-open:rotate-180"
                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="pb-6 -mt-1 pr-8 text-[15px] sm:text-base text-stone-600 leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Related pages ────────────────────────────────────────────────── */}
        <section>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            <h2 className={`${H2} mb-10 sm:mb-14 max-w-2xl text-balance`}>
              Explore more ways to use ChordSheetMaker
            </h2>
            <div className="grid gap-8 sm:gap-10 sm:grid-cols-3">
              {relatedPages.map((p) => (
                <Link key={p.slug} href={`/${p.slug}`} className="group flex flex-col border-t border-ink pt-5">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord">
                    {p.eyebrow}
                  </span>
                  <p className="mt-3 font-display text-2xl leading-snug text-ink">
                    {p.h1} <em>{p.h1Accent}</em>
                  </p>
                  <span className="mt-4 text-sm font-semibold text-ink underline underline-offset-4 decoration-ink/25 group-hover:decoration-ink transition-colors self-start">
                    Learn more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="on-ink bg-ink text-paper">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-28">
            <h2 className={`font-display font-medium text-[2.4rem] sm:text-6xl ${CHART_LEADING} tracking-[-0.02em] mb-6 max-w-3xl`}>
              <ChordedLine text={page.ctaHeading} chords={["Am", "F"]} />
            </h2>
            <p className="text-lg text-stone-300 mb-10 max-w-md leading-relaxed">
              {page.ctaBody}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <CtaLink from={page.slug} href="/songs?welcome=1" className={`${BTN_PAPER} px-8 py-4 text-base`}>
                Try it free <span aria-hidden>→</span>
              </CtaLink>
              <Link href="/pricing" className="text-sm text-stone-300 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors px-1 py-2 self-start sm:self-auto">
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-ink border-t border-white/10 px-5 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <Link href="/" className="text-sm font-extrabold tracking-tight text-white/80" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-300">Maker</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 text-xs text-stone-400 [&>a]:py-2">
            {LANDING_PAGES.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`} className="hover:text-white transition-colors">
                {p.eyebrow}
              </Link>
            ))}
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <p className="text-xs text-stone-400 whitespace-nowrap">
            © {new Date().getFullYear()} ChordSheetMaker.ai
          </p>
        </div>
      </footer>

      <ScrollToTop tone="ink" />
    </div>
  );
}
