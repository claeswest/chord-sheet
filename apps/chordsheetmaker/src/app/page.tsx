import Link from "next/link";
import ScrollToTop from "@/components/ui/ScrollToTop";
import CtaLink from "@/components/ui/CtaLink";
import FaqSection from "@/components/ui/FaqSection";
import StickyMobileCta from "@/components/ui/StickyMobileCta";
import BuildStamp from "@clavos/core/build-stamp";
import HeroDemo from "@/components/ui/HeroDemo";
import TransformationSection from "@/components/ui/TransformationSection";
import ExamplesSection from "@/components/ui/ExamplesSection";
import Image from "next/image";
import { EXAMPLE_SONGS } from "@/data/exampleSongs";
import { auth } from "@/lib/auth";
import { PLANS, allowanceLabel, yearlySavingPercent, yearlyPerMonth, type Feature, type Plan } from "@/lib/plans";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { BTN_INK, BTN_LINE, BTN_PAPER, CHART_LEADING, Chorded, Eyebrow, H2, Wordmark } from "@/components/landing/kit";

const PLAN_ORDER: Plan[] = ["free", "monthly", "yearly"];

// Where each example sheet lies in the closing section.
const SHEET_SPOTS = [
  "left-0 top-0 -rotate-[5deg]",
  "right-0 top-[24%] rotate-[4deg]",
  "left-[10%] bottom-0 -rotate-[2deg]",
];
const FEATURE_LABELS: Record<string, string> = {
  songLimit: "Songs",
  chordTranspose: "Chord transposition",
  pdfExport: "PDF export",
  sharing: "Share links",
  setlists: "Setlists & collections",
  prioritySupport: "Priority support",
};

// Nine things in the order you meet them. One sentence each: the sections
// above have already shown most of this, so here it only needs naming.
// `limited` marks what the free plan only gives a taste of (see plans.ts) —
// a list of features that hides which ones cost money is a small lie.
const featureGroups: { label: string; items: { title: string; description: string; limited?: boolean }[] }[] = [
  {
    label: "Get the song in",
    items: [
      { title: "Search by name", description: "Type an artist and a title, and the AI builds the chart with the chords over the right words." },
      { title: "Snap a photo", description: "Photograph a handwritten or printed sheet and it becomes a chart you can edit. Old notebooks welcome." },
      { title: "Paste from anywhere", description: "Paste lyrics and chords from a website or a document, and the formatting is cleaned up for you." },
    ],
  },
  {
    label: "Make it yours",
    items: [
      { title: "Drag chords into place", description: "Drop each chord above the syllable where the change lands. No fiddling with spaces." },
      { title: "Transpose to your key", description: "One tap moves the whole chart up or down, with every chord respelled for the new key." },
      { title: "Style it with AI", description: "One press, and the AI reads the lyrics and gives the song fonts, colours and a picture." },
    ],
  },
  {
    label: "Play it",
    items: [
      { title: "Hands-free auto-scroll", description: "Press play and the chart scrolls at your pace, in text large enough to read from the music stand." },
      { title: "Setlists and collections", description: "Group songs for a gig or for practice, and play through them in order: the next song is one tap away." },
      { title: "Print and share", description: "Export a clean PDF for the music stand, or send a link your band can open and play without an account.", limited: true },
    ],
  },
];

const steps = [
  { n: 1, title: "Find or import your song", body: "Search by artist and title, snap a photo of a paper sheet, or paste the text from anywhere." },
  { n: 2, title: "Make it yours",            body: "Let the AI style it from the lyrics, drag chords into place, and move it to your key." },
  { n: 3, title: "Press play and perform",   body: "The chart scrolls at your pace and your hands stay on the instrument. File it in a setlist for next time." },
];

export default async function HomePage() {
  const session = await auth();
  // The page's one call to action. It had six wordings and two destinations
  // (some buttons opened the empty song library); every "start" button now
  // says this and goes here. The exceptions promise something specific:
  // the photo section opens the import dialog, the paid plans open checkout.
  const start = session
    ? { href: "/editor/new", label: "Create a chord chart" }
    : { href: "/editor/new?start=demo", label: "Build a chart free" };

  return (
    <div className={`${LANDING_FONTS} flex flex-col min-h-full bg-paper text-ink`}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-rule">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-4 max-w-6xl mx-auto w-full">
          <Link href="/" aria-label="ChordSheetMaker — home"><Wordmark className="text-[1.15rem] sm:text-2xl" /></Link>
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
                {/* The full label does not fit beside the wordmark on a phone. */}
                <CtaLink from="home-header" href={start.href} className={`${BTN_INK} px-4 py-2 text-sm`}>
                  <span className="sm:hidden">Try it free</span>
                  <span className="hidden sm:inline">{start.label}</span> <span aria-hidden>→</span>
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
                For every musician, from sofa to stage
              </Eyebrow>

              {/* Set like a line on a chart: the chords are the page's ornament.
                  The tall leading is the room they sit in. */}
              <h1 className={`hero-reveal hero-reveal-2 font-display font-medium text-[2.6rem] sm:text-6xl lg:text-[4.25rem] ${CHART_LEADING} tracking-[-0.02em] text-ink mb-5 sm:mb-6`}>
                <Chorded chord="G">Turn</Chorded> any <Chorded chord="D">song</Chorded> into a{" "}
                <Chorded chord="Em"><em>stunning</em></Chorded>{" "}
                <span className="whitespace-nowrap">chord <Chorded chord="C">chart</Chorded></span>
              </h1>

              <p className="hero-reveal hero-reveal-3 text-lg sm:text-xl text-stone-600 max-w-md mb-8 leading-relaxed text-balance">
                Every chord in the right place. Then press play and perform it{" "}
                <span className="whitespace-nowrap">hands-free.</span>
              </p>

              <div className="hero-reveal hero-reveal-4 flex flex-col sm:flex-row gap-3 mb-4">
                <CtaLink
                  from="home-hero"
                  href={start.href}
                  className={`${BTN_INK} px-7 py-3.5 text-base`}
                >
                  {start.label} <span aria-hidden>→</span>
                </CtaLink>
                {/* Secondary CTA must lead somewhere else — it used to point at the
                    same demo editor as the primary button, so the choice was fake. */}
                <CtaLink from="home-see-how" href="#how" className={`${BTN_LINE} px-7 py-3.5 text-base`}>
                  See how it works
                </CtaLink>
              </div>

              {/* Trust microcopy — answers "what's the catch?" at the moment of decision */}
              <p className="hero-reveal hero-reveal-4 text-sm text-stone-500">
                Free to start · No credit card · No account needed
              </p>
            </div>

            {/* The product, doing the thing it is for: a real chart, scrolling. */}
            <figure className="hero-reveal hero-reveal-5 w-full max-w-md mx-auto lg:max-w-none">
              <HeroDemo />
              <figcaption className="mt-3 font-mono text-[11px] leading-relaxed text-stone-500">
                Play mode, as it looks when you play: the sheet scrolls and your hands stay on the instrument
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── How it works — three steps ("See how it works" lands here) ───── */}
        <section id="how" className="scroll-mt-20 border-b border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
            <Eyebrow className="mb-4">How it works</Eyebrow>
            <h2 className="font-display font-medium text-3xl sm:text-4xl tracking-[-0.02em] text-ink text-balance mb-10 sm:mb-12">
              From a song to the stage in three steps
            </h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-9">
              {steps.map((h, i) => (
                <li key={h.n}>
                  {/* Each step is a bar: its number, a line through to the
                      next, and a final double bar line after the last. */}
                  <div aria-hidden className="mb-5 flex items-center gap-3">
                    <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-chord">{String(h.n).padStart(2, "0")}</span>
                    <span className="h-px flex-1 bg-ink/25" />
                    {i < steps.length - 1 ? (
                      <svg className="hidden md:block -ml-3 h-2.5 w-2.5 shrink-0 text-ink/45" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 1l4 4-4 4" />
                      </svg>
                    ) : (
                      <span className="hidden md:flex -ml-3 shrink-0 items-stretch gap-[2px] h-3.5">
                        <span className="w-px bg-ink/60" />
                        <span className="w-[3px] bg-ink" />
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-medium text-2xl leading-snug tracking-[-0.01em] text-ink mb-2">{h.title}</h3>
                  <p className="text-[15px] text-stone-600 leading-relaxed max-w-[38ch]">{h.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 sm:mt-12">
              <CtaLink from="home-how" href={start.href} className={`${BTN_LINE} px-6 py-3 text-[15px]`}>
                {start.label} <span aria-hidden>→</span>
              </CtaLink>
            </div>
          </div>
        </section>

        {/* ── Examples — the strongest proof, straight after the hero ──────── */}
        <ExamplesSection cta={start} />

        {/* Photo import: show the before/after result before listing features. */}
        <TransformationSection />

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section id="features" className="scroll-mt-16 border-t border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 lg:gap-16 lg:items-end mb-10 sm:mb-14">
              <div>
                <Eyebrow className="mb-4">Features</Eyebrow>
                <h2 className={`${H2} text-balance`}>Everything you need to play</h2>
              </div>
              <p className="text-lg text-stone-600 leading-relaxed lg:pb-1.5">
                Focus on the music, not the formatting.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12">
              {featureGroups.map((g) => (
                <div key={g.label}>
                  <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500 pb-3">{g.label}</h3>
                  <ul className="border-b border-ink/15">
                    {g.items.map((f) => (
                      <li key={f.title} className="border-t border-ink/15 py-5">
                        <h4 className="font-display font-medium text-xl leading-snug tracking-[-0.01em] text-ink mb-1.5 flex flex-wrap items-baseline gap-x-3">
                          {f.title}
                          {f.limited && (
                            <Link href="#pricing" className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-chord hover:underline underline-offset-4">
                              A few songs free
                            </Link>
                          )}
                        </h4>
                        <p className="text-[15px] text-stone-600 leading-relaxed">{f.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="scroll-mt-16 border-t border-rule">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
            {/* The heading used to repeat the label above it ("Pricing" /
                "Plans & pricing"); the line that says something is the heading now. */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 lg:gap-16 lg:items-end mb-10 sm:mb-14">
              <div>
                <Eyebrow className="mb-4">Pricing</Eyebrow>
                <h2 className={`${H2} text-balance`}>Start free. Upgrade when you&apos;re ready.</h2>
              </div>
              <p className="text-lg text-stone-600 leading-relaxed lg:pb-1.5">
                Every plan includes song search, photo import, AI styling and setlists.
              </p>
            </div>
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
                              <span className="ml-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-chord whitespace-nowrap">Save {yearlySavingPercent()}%</span>
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
                              {allowanceLabel(key as Feature, val) ?? label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="px-6 pb-6 space-y-2.5">
                      {/* Only the free button feeds the cta_try_free funnel step;
                          the paid ones lead to checkout, a different journey. */}
                      {isFree ? (
                        <CtaLink from="home-pricing-free" href={start.href} className={`${BTN_LINE} w-full py-3 text-sm`}>
                          {start.label} <span aria-hidden>→</span>
                        </CtaLink>
                      ) : (
                        // Straight to where the trial starts. /pricing?plan= opens
                        // checkout by itself for someone signed in; a visitor signs
                        // in first, on a page that says the trial continues after.
                        // It used to open the price list a second time.
                        <Link
                          href={session ? `/pricing?plan=${planKey}` : `/login?next=/pricing?plan=${planKey}`}
                          className={`${isPopular ? BTN_INK : BTN_LINE} w-full py-3 text-sm`}
                        >
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
        <section id="get-started" className="on-ink bg-ink text-paper overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-28 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-10 lg:gap-16 items-center">
           <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord-light mb-6 sm:mb-8">
              Free to start
            </p>
            <h2 className={`font-display font-medium text-[2.5rem] sm:text-6xl ${CHART_LEADING} tracking-[-0.02em] mb-6`}>
              <Chorded chord="Am">Your</Chorded> songs <Chorded chord="F">deserve</Chorded>
              <br className="hidden sm:block" />{" "}
              a <Chorded chord="C"><em>better</em></Chorded> <Chorded chord="G">home.</Chorded>
            </h2>
            <p className="text-lg text-stone-300 mb-10 max-w-md leading-relaxed">
              Build, transpose and play your chord charts on any device, at home or on stage.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <CtaLink
                from="home-bottom"
                href={session ? "/songs" : start.href}
                className={`${BTN_PAPER} px-8 py-4 text-base`}
              >
                {session ? "Go to my songs" : start.label} <span aria-hidden>→</span>
              </CtaLink>
              {!session && (
                <Link href="/pricing" className="text-sm text-stone-300 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors px-1 py-2 self-start sm:self-auto">
                  See pricing
                </Link>
              )}
            </div>
            {!session && (
              <p className="mt-5 text-sm text-stone-400">No credit card · No account needed</p>
            )}
           </div>

           {/* The three example sheets, laid out like pages on a table. The
               right half of this block was empty on a wide screen. */}
           <div aria-hidden className="relative hidden lg:block h-[25rem]">
             {EXAMPLE_SONGS.filter((s) => s.listed).map((s, i) => (
               <div
                 key={s.slug}
                 className={`absolute w-[64%] overflow-hidden rounded-lg border border-white/15 ${SHEET_SPOTS[i % SHEET_SPOTS.length]}`}
                 style={{ boxShadow: "0 30px 50px -24px rgba(0,0,0,0.8)" }}
               >
                 <div className="relative aspect-[860/592]">
                   <Image src={s.img} alt="" fill sizes="360px" className="object-cover object-top" />
                 </div>
               </div>
             ))}
           </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-ink border-t border-white/10 px-5 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <span><Wordmark onInk className="text-lg" /></span>
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
            © {new Date().getFullYear()} ChordSheetMaker.ai · Built for musicians
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
