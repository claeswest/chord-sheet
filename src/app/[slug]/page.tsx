import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ScrollToTop from "@/components/ui/ScrollToTop";
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

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-zinc-900" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-600">Maker</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-600">
            <Link href="/#features" className="hover:text-zinc-900 transition-colors hidden sm:block">Features</Link>
            <Link href="/pricing" className="hover:text-zinc-900 transition-colors hidden sm:block">Pricing</Link>
            <Link href="/login" className="hover:text-zinc-900 transition-colors hidden sm:block">Sign in</Link>
            <Link
              href="/songs?welcome=1"
              className="relative overflow-hidden group inline-flex items-center gap-1.5 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 shadow-md shadow-indigo-900/40 hover:shadow-indigo-500/40 hover:scale-[1.03] whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)" }}
            >
              <span className="relative">Try it free</span>
              <svg className="relative w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative flex flex-col items-center text-center px-5 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #1a1640 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.25) 0%, transparent 70%)",
          }} />

          <span className="relative inline-block bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full mb-5 border border-indigo-500/30">
            {page.eyebrow}
          </span>

          <h1 className="relative text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-5 max-w-4xl">
            {page.h1}{" "}
            <span className="text-indigo-400">{page.h1Accent}</span>
          </h1>

          <p className="relative text-base sm:text-xl text-zinc-300 max-w-2xl mb-8 leading-relaxed">
            {page.intro}
          </p>

          <Link
            href="/songs?welcome=1"
            className="relative overflow-hidden group text-white px-8 py-3.5 sm:py-4 rounded-full text-base font-semibold transition-all duration-300 shadow-lg shadow-indigo-900/60 hover:shadow-indigo-500/40 hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)" }}
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)" }} />
            <span className="relative flex items-center justify-center gap-2">
              Try it free
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </span>
          </Link>
          <p className="relative mt-4 text-xs text-white/30">No credit card required · Free forever plan available</p>
        </section>

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        <section className="px-5 sm:px-6 py-14 sm:py-20" style={{ background: "linear-gradient(180deg, #f8f7ff 0%, #f0efff 100%)" }}>
          <div className="max-w-3xl mx-auto space-y-10 sm:space-y-12">
            {page.sections.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-3 tracking-tight">
                  {sec.heading}
                </h2>
                <p className="text-zinc-600 leading-relaxed text-base sm:text-lg">
                  {sec.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section
          className="relative px-5 sm:px-6 py-16 sm:py-24 text-center overflow-hidden"
          style={{ background: "linear-gradient(180deg, #1e1b4b 0%, #0f0c29 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 80%, rgba(99,102,241,0.3) 0%, transparent 70%)",
          }} />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 tracking-tight leading-tight">
              {page.ctaHeading}
            </h2>
            <p className="text-zinc-400 mb-10 max-w-md mx-auto leading-relaxed text-lg">
              {page.ctaBody}
            </p>
            <Link
              href="/songs?welcome=1"
              className="relative overflow-hidden group inline-flex items-center gap-2 text-white px-10 py-4 rounded-full text-base font-semibold transition-all duration-300 shadow-xl shadow-indigo-900/60 hover:shadow-indigo-500/50 hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)" }}
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)" }} />
              <span className="relative">Try it free</span>
              <svg className="relative w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </Link>
            <div className="mt-8">
              <Link href="/pricing" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                See pricing →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0f0c29" }} className="border-t border-white/5 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="text-sm font-extrabold tracking-tight text-white/70" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-400">Maker</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/30">
            {LANDING_PAGES.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`} className="hover:text-white/60 transition-colors">
                {p.eyebrow}
              </Link>
            ))}
            <Link href="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
          </nav>
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} ChordSheetMaker.ai
          </p>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
