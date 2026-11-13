import Link from "next/link";
import ScrollToTop from "@/components/ui/ScrollToTop";
import CtaLink from "@/components/ui/CtaLink";
import FaqSection from "@/components/ui/FaqSection";
import StickyMobileCta from "@/components/ui/StickyMobileCta";
import BuildStamp from "@clavos/core/build-stamp";
import HeroDemo from "@/components/ui/HeroDemo";
import TransformationSection from "@/components/ui/TransformationSection";
import ExamplesSection from "@/components/ui/ExamplesSection";
import { auth } from "@/lib/auth";
import { PLANS, yearlySavingPercent, yearlyPerMonth, type Plan } from "@/lib/plans";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { BTN_INK, BTN_LINE, BTN_PAPER, CHART_LEADING, Chorded, Eyebrow, EYEBROW, H2 } from "@/components/landing/kit";

const PLAN_ORDER: Plan[] = ["free", "monthly", "yearly"];
const FEATURE_LABELS: Record<string, string> = {
  songLimit: "Songs",
  chordTranspose: "Chord transposition",
  pdfExport: "PDF export",
  sharing: "Public song sharing",
  setlists: "Setlists & collections",
  prioritySupport: "Priority support",
};

const features = [
  {
    title: "Find any song with AI",
    description: "Type a song name and artist — AI returns a clean chord chart with the chords sitting right above the lyrics, in seconds.",
  },
  {
    title: "Snap a photo",
    description: "Photograph a handwritten or printed chord sheet — AI reads it and turns it into a fully editable chart. Old notebooks welcome.",
  },
  {
    title: "Paste from any site",
    description: "Copy lyrics and chords from anywhere on the web and paste them in — AI cleans up the formatting into a proper chart automatically.",
  },
  {
    title: "Fix alignment by dragging",
    description: "Grab any chord and drop it above the exact syllable where the change lands. What you build is what you play — no fiddly spacing.",
  },
  {
    title: "Transpose to your key",
    description: "Move the whole chart up or down with one tap to fit your singer's range. Every chord updates instantly — no capo math.",
  },
  {
    title: "Hands-free auto-scroll",
    description: "Hit play and the chart scrolls at your pace — large, readable text on phone, tablet or laptop. On the sofa or mid-gig, keep both hands on your instrument.",
  },
  {
    title: "Setlists & collections",
    description: "Group songs into setlists for gigs, or collections for practicing at home — drag them into the order you want to play.",
  },
  {
    title: "One-tap PDF export",
    description: "Export a clean, print-ready PDF with every chord still perfectly aligned — for the music stand, the folder, or the rest of the band.",
  },
  {
    title: "Share & sync",
    description: "Send a link anyone can open and play, auto-scroll included — no account needed. Your own library stays synced across all your devices.",
  },
];

const steps = [
  { n: 1, title: "Find or import your song", body: "Search any title with AI, snap a photo of a paper sheet, or paste from any site." },
  { n: 2, title: "Make it yours",            body: "Style it with AI backgrounds and fonts, drag chords into place, transpose to your key." },
  { n: 3, title: "Press play and perform",   body: "The chart scrolls hands-free at your pace — then file it into a setlist or collection for next time." },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <div className={`${LANDING_FONTS} flex flex-col min-h-full bg-paper text-ink`}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-rule">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-4 max-w-6xl mx-auto w-full">
          <Link href="/" aria-label="ChordSheetMaker — home" className="text-lg sm:text-xl font-extrabold tracking-tight text-ink whitespace-nowrap" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-chord">Maker</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-7 text-sm text-stone-600">
            <Link href="#examples" className="hover:text-ink transition-colors hidden sm:block">Examples</Link>
            <Link href="#features" className="hover:text-ink transition-colors hidden sm:block">Features</Link>
            <Link href="#pricing"  className="hover:text-ink transition-colors hidden sm:block">Pricing</Link>
            {session ? (
              <Link href="/songs" className={`${BTN_INK} px-4 py-2 text-sm`}>
                Songs
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-ink transition-colors whitespace-nowrap py-2">Sign in</Link>
                <CtaLink from="home-header" href="/editor/new?start=demo" className={`${BTN_INK} px-4 py-2 text-sm`}>
                  Try it free <span aria-hidden>→</span>
                </CtaLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero — the sentence on the left, the product on the right ────── */}
        <section className="border-b border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 lg:pt-20 pb-12 sm:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-10 lg:gap-16 items-center">
            <div>
              <Eyebrow className="hero-reveal hero-reveal-1 mb-6 sm:mb-8">
                For every musician — from sofa to stage
              </Eyebrow>

              {/* Set like a line on a chart: the chords are the page's ornament.
                  The tall leading is the room they sit in. */}
              <h1 className={`hero-reveal hero-reveal-2 font-display font-medium text-[2.6rem] sm:text-6xl lg:text-[4.25rem] ${CHART_LEADING} tracking-[-0.02em] text-ink mb-5 sm:mb-6`}>
                <Chorded chord="G">Turn</Chorded> any <Chorded chord="D">song</Chorded> into a{" "}
                <Chorded chord="Em"><em>stunning</em></Chorded>{" "}
                <span className="whitespace-nowrap">chord <Chorded chord="C">chart</Chorded></span>
              </h1>

              <p className="hero-reveal hero-reveal-3 text-lg sm:text-xl text-stone-600 max-w-md mb-8 leading-relaxed text-balance">
                Every chord in the right place — then press play and perform it{" "}
                <span className="whitespace-nowrap">hands-free.</span>
              </p>

              <div className="hero-reveal hero-reveal-4 flex flex-col sm:flex-row gap-3 mb-4">
                <CtaLink
                  from="home-hero"
                  href={session ? "/editor/new" : "/editor/new?start=demo"}
                  className={`${BTN_INK} px-7 py-3.5 text-base`}
                >
                  {session ? "Create a chord chart" : "Build a chart free"} <span aria-hidden>→</span>
                </CtaLink>
                {/* Secondary CTA must lead somewhere else — it used to point at the
                    same demo editor as the primary button, so the choice was fake. */}
                <CtaLink from="home-see-how" href="#how" className={`${BTN_LINE} px-7 py-3.5 text-base`}>
                  See how it works
                </CtaLink>
              </div>

              {/* Trust microcopy — answers "what's the catch?" at the moment of decision */}
              <p className="hero-reveal hero-reveal-4 text-sm text-stone-500">
                Free to start · No credit card · Ready in 30 seconds
              </p>
            </div>

            {/* The product, doing the thing it is for: a real chart, scrolling. */}
            <figure className="hero-reveal hero-reveal-5 w-full max-w-md mx-auto lg:max-w-none">
              <HeroDemo />
              <figcaption className="mt-3 font-mono text-[11px] leading-relaxed text-stone-500">
                Auto-scroll in action — hands-free play mode, exactly as it looks when you play
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── How it works — three steps ("See how it works" lands here) ───── */}
        <section id="how" className="scroll-mt-20 border-b border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
            <h2 className={`${EYEBROW} mb-8 sm:mb-10`}>How it works</h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {steps.map((h) => (
                <li key={h.n} className="flex md:block gap-5 border-t border-ink pt-5">
                  <span aria-hidden className="font-display text-5xl md:text-6xl leading-none text-ink md:block md:mb-5 shrink-0 w-10 md:w-auto">{h.n}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink mb-1.5">{h.title}</h3>
                    <p className="text-[15px] text-stone-600 leading-relaxed">{h.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Examples — the strongest proof, straight after the hero ──────── */}
        <ExamplesSection />

        {/* Photo import: show the before/after result before listing features. */}
        <TransformationSection />

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section id="features" className="scroll-mt-16 border-t border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            <Eyebrow className="mb-4">Features</Eyebrow>
            <h2 className={`${H2} mb-3`}>
              Everything you need to play
            </h2>
            <p className="text-lg text-stone-600 mb-10 sm:mb-14 max-w-xl">
              Focus on the music, not the formatting.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8 sm:gap-y-10">
              {features.map((f, i) => (
                <li key={f.title} className="border-t border-rule pt-5">
                  <span aria-hidden className="block font-mono text-[11px] text-chord mb-3">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-lg font-semibold text-ink mb-1.5">{f.title}</h3>
                  <p className="text-[15px] text-stone-600 leading-relaxed">{f.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Testimonial — reassurance right before the pricing decision ──── */}
        <section className="bg-paper-deep border-y border-rule">
          <figure className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            <blockquote className="font-display text-2xl sm:text-[2rem] leading-[1.35] tracking-[-0.01em] text-ink">
              <p>
                &ldquo;ChordSheetMaker has made playing at home much easier for me. I have loads of
                little songs in old notebooks, and now I can just take a photo and turn them
                into chord sheets instead of typing everything out.&rdquo;
              </p>
              <p className="mt-5 font-sans text-base sm:text-[17px] leading-relaxed tracking-normal text-stone-600">
                My handwriting is a bit messy so I sometimes need to fix a few things, but
                it&apos;s still way quicker. I also like adding backgrounds and fonts, probably
                more than I should. Then I put it on my tablet, change the key if needed,
                and just play.
              </p>
            </blockquote>
            <figcaption className="mt-7 text-sm">
              <span className="font-semibold text-ink">Emma Larson</span>
              <span className="text-stone-500"> — Hobby guitarist · Liverpool</span>
            </figcaption>
          </figure>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="scroll-mt-16">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            <Eyebrow className="mb-4">Pricing</Eyebrow>
            <h2 className={`${H2} mb-3`}>Plans &amp; pricing</h2>
            <p className="text-lg text-stone-600 mb-2">Start free. Upgrade when you&apos;re ready.</p>
            <p className="text-sm text-stone-500 mb-10 sm:mb-14 max-w-xl">
              Every plan includes AI song search, photo import, AI backgrounds &amp; fonts, and setlists &amp; collections.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {PLAN_ORDER.map((planKey) => {
                const plan = PLANS[planKey];
                const isPopular = planKey === "yearly";
                const isFree = planKey === "free";
                return (
                  <div
                    key={planKey}
                    className={`relative flex flex-col rounded-xl bg-white ${
                      isPopular ? "border-2 border-ink" : "border border-rule"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-6 bg-ink text-paper font-mono text-[10px] font-medium uppercase tracking-[0.14em] px-2.5 py-1 rounded">
                        Most popular
                      </span>
                    )}

                    <div className="px-6 pt-8 pb-6">
                      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500 mb-4">{plan.name}</h3>

                      <div className="flex items-baseline gap-2">
                        {isFree ? (
                          <span className="font-display text-5xl leading-none text-ink">Free</span>
                        ) : (
                          <>
                            <span className="font-display text-5xl leading-none text-ink">${plan.price}</span>
                            <span className="text-stone-500 text-sm">{planKey === "monthly" ? "/mo" : "/yr"}</span>
                            {planKey === "yearly" && (
                              <span className="ml-1 text-xs font-semibold text-emerald-700 whitespace-nowrap">Save {yearlySavingPercent()}%</span>
                            )}
                          </>
                        )}
                      </div>

                      <p className="mt-3 text-sm text-stone-500 min-h-5">
                        {planKey === "yearly" ? `≈ $${yearlyPerMonth()}/month, billed yearly` : plan.description}
                      </p>
                    </div>

                    <div className="px-6 py-6 border-t border-rule flex-1">
                      <ul className="space-y-3">
                        {Object.keys(FEATURE_LABELS).filter((key) => {
                          const val = plan.features[key as keyof typeof plan.features];
                          const active = val !== false && val !== 0;
                          return isFree ? true : active;
                        }).map((key) => {
                          const label = FEATURE_LABELS[key];
                          const val = plan.features[key as keyof typeof plan.features];
                          const active = val !== false && val !== 0;
                          return (
                            <li key={key} className={`flex items-baseline gap-3 text-[15px] ${active ? "text-ink" : "text-stone-400"}`}>
                              <span aria-hidden className={`w-3 shrink-0 text-center font-semibold ${active ? "text-chord" : "text-stone-300"}`}>
                                {active ? "✓" : "–"}
                              </span>
                              {!active && <span className="sr-only">Not included: </span>}
                              {key === "songLimit"
                                ? val === true ? "Unlimited songs" : `Up to ${val} songs`
                                : label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="px-6 pb-6 space-y-2.5">
                      {/* Only the free button feeds the cta_try_free funnel step;
                          the paid ones lead to checkout, a different journey. */}
                      {isFree ? (
                        <CtaLink from="home-pricing-free" href="/songs" className={`${BTN_LINE} w-full py-3 text-sm`}>
                          Try it free
                        </CtaLink>
                      ) : (
                        <Link href="/pricing" className={`${isPopular ? BTN_INK : BTN_LINE} w-full py-3 text-sm`}>
                          Start 7-day free trial <span aria-hidden>→</span>
                        </Link>
                      )}
                      {/* Always rendered so the three buttons sit on one line. */}
                      <p className={`text-center text-xs text-stone-500 ${isFree ? "invisible" : ""}`} aria-hidden={isFree}>
                        {isFree
                          ? " "
                          : <>7 days free · then ${plan.price}{planKey === "monthly" ? "/mo" : "/yr"} · cancel anytime</>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-stone-500 mt-8">
              Secure payments via Stripe · Cancel anytime · No hidden fees
            </p>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <FaqSection />

        {/* ── Closing CTA — the sticky phone CTA steps aside when this shows ── */}
        <section id="get-started" className="on-ink bg-ink text-paper">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-28">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-300 mb-6 sm:mb-8">
              Free to start
            </p>
            <h2 className={`font-display font-medium text-[2.5rem] sm:text-6xl lg:text-7xl ${CHART_LEADING} tracking-[-0.02em] mb-6`}>
              <Chorded chord="Am">Your</Chorded> songs <Chorded chord="F">deserve</Chorded>
              <br className="hidden sm:block" />{" "}
              a <Chorded chord="C"><em>better</em></Chorded> <Chorded chord="G">home.</Chorded>
            </h2>
            <p className="text-lg text-stone-300 mb-10 max-w-md leading-relaxed">
              Build, transpose and play your chord charts — on any device, at home or on stage.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <CtaLink
                from="home-bottom"
                href={session ? "/songs" : "/editor/new?start=demo"}
                className={`${BTN_PAPER} px-8 py-4 text-base`}
              >
                {session ? "Go to my songs" : "Create your first chart free"} <span aria-hidden>→</span>
              </CtaLink>
              {!session && (
                <Link href="/pricing" className="text-sm text-stone-300 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors px-1 py-2 self-start sm:self-auto">
                  See pricing
                </Link>
              )}
            </div>
            {!session && (
              <p className="mt-5 text-sm text-stone-400">Free to start · No credit card · Works on any device</p>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-ink border-t border-white/10 px-5 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-sm font-extrabold tracking-tight text-white/80" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-300">Maker</span>
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 text-xs text-stone-400 [&>a]:py-2">
            <Link href="#examples" className="hover:text-white transition-colors">Examples</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing"  className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#faq"      className="hover:text-white transition-colors">FAQ</Link>
            <Link href="/songs"    className="hover:text-white transition-colors">My songs</Link>
            <Link href="/terms"    className="hover:text-white transition-colors">Terms</Link>
            <a href="mailto:claes@clavos.se" className="hover:text-white transition-colors">Contact</a>
          </nav>
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} ChordSheetMaker.ai — Built for musicians
          </p>
        </div>
        <div className="max-w-6xl mx-auto mt-4 text-center sm:text-right">
          <BuildStamp className="text-[10px] text-white/15 font-mono" />
        </div>
      </footer>

      {!session && <StickyMobileCta />}
      {/* Guests get the sticky CTA on phones — lift the button clear of it */}
      <ScrollToTop raised={!session} tone="ink" />
    </div>
  );
}
