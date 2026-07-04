import Link from "next/link";
import Image from "next/image";
import ScrollToTop from "@/components/ui/ScrollToTop";
import CtaLink from "@/components/ui/CtaLink";
import BuildStamp from "@/components/ui/BuildStamp";
import FeatureCard from "@/components/ui/FeatureCard";
import TransformationSection from "@/components/ui/TransformationSection";
import ExamplesSection from "@/components/ui/ExamplesSection";
import { auth } from "@/lib/auth";
import { PLANS, type Plan } from "@/lib/plans";

const PLAN_ORDER: Plan[] = ["free", "monthly", "yearly"];
const FEATURE_LABELS: Record<string, string> = {
  songLimit: "Songs",
  chordTranspose: "Chord transposition",
  pdfExport: "PDF export",
  sharing: "Public song sharing",
  setlists: "Setlists / folders",
  prioritySupport: "Priority support",
};

const features = [
  {
    icon: "✦",
    title: "Find any song with AI",
    description: "Type a song name and artist — AI returns a clean chord chart with the chords sitting right above the lyrics, in seconds.",
    hex: "#6366f1",
    iconBg: "rgba(99,102,241,0.12)",
    cardBg: "rgba(99,102,241,0.04)",
    glow: "rgba(99,102,241,0.18)",
  },
  {
    icon: "🎚️",
    title: "Transpose to your key",
    description: "Move the whole chart up or down with one tap to fit your singer's range. Every chord updates instantly — no capo math.",
    hex: "#8b5cf6",
    iconBg: "rgba(139,92,246,0.12)",
    cardBg: "rgba(139,92,246,0.04)",
    glow: "rgba(139,92,246,0.18)",
  },
  {
    icon: "▶️",
    title: "Auto-scroll on stage",
    description: "Hit play and the chart scrolls hands-free at your pace — large, readable text on phone, tablet or laptop. Keep both hands on your instrument.",
    hex: "#10b981",
    iconBg: "rgba(16,185,129,0.12)",
    cardBg: "rgba(16,185,129,0.04)",
    glow: "rgba(16,185,129,0.18)",
  },
  {
    icon: "🎸",
    title: "Fix alignment by dragging",
    description: "Grab any chord and drop it above the exact syllable where the change lands. What you build is what you play — no fiddly spacing.",
    hex: "#3b82f6",
    iconBg: "rgba(59,130,246,0.12)",
    cardBg: "rgba(59,130,246,0.04)",
    glow: "rgba(59,130,246,0.18)",
  },
  {
    icon: "📷",
    title: "Import photos & paste",
    description: "Snap a photo of a paper or printed chord sheet, or paste from any site — AI cleans it up into a fully editable chart.",
    hex: "#14b8a6",
    iconBg: "rgba(20,184,166,0.12)",
    cardBg: "rgba(20,184,166,0.04)",
    glow: "rgba(20,184,166,0.18)",
  },
  {
    icon: "📄",
    title: "Setlists, PDF & sharing",
    description: "Organize songs into setlists for each gig, export a clean PDF, or share a link with your band — all synced across devices.",
    hex: "#f43f5e",
    iconBg: "rgba(244,63,94,0.12)",
    cardBg: "rgba(244,63,94,0.04)",
    glow: "rgba(244,63,94,0.18)",
  },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-zinc-100">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-zinc-900 whitespace-nowrap" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-600">Maker</span>
          </span>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm text-zinc-600">
            <Link href="#features" className="hover:text-zinc-900 transition-colors hidden sm:block">Features</Link>
            <Link href="#pricing"  className="hover:text-zinc-900 transition-colors hidden sm:block">Pricing</Link>
            {session ? (
              <Link href="/songs" className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
                Songs
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-zinc-900 transition-colors whitespace-nowrap">Sign in</Link>
                <CtaLink from="home-header" href="/editor/new?start=demo"
                  className="relative overflow-hidden group inline-flex items-center gap-1.5 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 shadow-md shadow-indigo-900/40 hover:shadow-indigo-500/40 hover:scale-[1.03] whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)" }}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)" }} />
                  <span className="relative">Try it free</span>
                  <svg className="relative w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </CtaLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero + Highlights (one dark section, zero seam) ──────────────── */}
        <section
          className="relative flex flex-col items-center text-center px-5 sm:px-6 pt-14 sm:pt-24 pb-10 sm:pb-16 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #1a1640 100%)" }}
        >
          {/* Radial glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.25) 0%, transparent 70%)",
          }} />

          {/* Drifting aurora blobs */}
          <div className="aurora aurora-a" style={{
            width: 480, height: 480, top: -140, left: "8%",
            background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
          }} />
          <div className="aurora aurora-b" style={{
            width: 520, height: 520, top: 60, right: "4%",
            background: "radial-gradient(circle, rgba(192,132,252,0.28) 0%, transparent 70%)",
          }} />

          {/* Floating chord chips — desktop only, purely decorative */}
          <div aria-hidden className="hidden lg:block absolute inset-0 pointer-events-none">
            <span className="chord-chip text-sm" style={{ top: "16%", left: "10%", ["--chip-tilt" as never]: "-8deg", animationDelay: "0s" }}>Am7</span>
            <span className="chord-chip text-base" style={{ top: "34%", left: "5%", ["--chip-tilt" as never]: "5deg", animationDelay: "1.6s" }}>G</span>
            <span className="chord-chip text-sm" style={{ top: "55%", left: "12%", ["--chip-tilt" as never]: "-4deg", animationDelay: "3.1s" }}>Dsus4</span>
            <span className="chord-chip text-base" style={{ top: "18%", right: "9%", ["--chip-tilt" as never]: "7deg", animationDelay: "0.9s" }}>Cmaj7</span>
            <span className="chord-chip text-sm" style={{ top: "38%", right: "5%", ["--chip-tilt" as never]: "-6deg", animationDelay: "2.4s" }}>Em</span>
            <span className="chord-chip text-base" style={{ top: "58%", right: "11%", ["--chip-tilt" as never]: "4deg", animationDelay: "4s" }}>F♯m7</span>
          </div>

          <span className="hero-reveal hero-reveal-1 relative inline-block bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full mb-5 border border-indigo-500/30 text-center max-w-xs sm:max-w-none">
            For gigging musicians, singers & cover bands
          </span>

          <h1 className="hero-reveal hero-reveal-2 relative text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-5 max-w-4xl">
            Turn any song into a{" "}
            <span className="gradient-text">stage-ready chord chart</span>
          </h1>

          <p className="hero-reveal hero-reveal-3 relative text-base sm:text-xl text-zinc-300 max-w-2xl mb-8 leading-relaxed">
            Get a clean chart with the chords in the right places, transpose it to your singer&apos;s key,
            and play hands-free with auto-scroll — on your phone, tablet or laptop.
          </p>

          <div className="hero-reveal hero-reveal-4 relative flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 sm:mb-16 w-full sm:w-auto max-w-xs sm:max-w-none">
            <CtaLink
              from="home-hero"
              href={session ? "/songs" : "/editor/new?start=demo"}
              className="cta-glow relative overflow-hidden group text-white px-8 py-3.5 sm:py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-[1.03] text-center"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)", backgroundSize: "200% 100%" }}
            >
              {/* shimmer sweep */}
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)", backgroundSize: "200% 100%" }} />
              <span className="relative flex items-center justify-center gap-2">
                Build a chart free
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </span>
            </CtaLink>
            <Link
              href="#features"
              className="border border-white/20 text-white/80 hover:text-white hover:border-white/40 px-8 py-3.5 sm:py-4 rounded-full text-base font-semibold transition-colors backdrop-blur-sm text-center"
            >
              See how it works
            </Link>
          </div>

          {/* Hero photo — gradient frame + glow */}
          <div className="hero-reveal hero-reveal-5 relative w-full max-w-3xl mx-auto mb-4">
            {/* Glow halo behind the photo */}
            <div className="absolute -inset-4 rounded-3xl pointer-events-none" style={{
              background: "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(129,140,248,0.35) 0%, transparent 70%)",
              filter: "blur(24px)",
            }} />
            <div className="relative rounded-t-2xl p-[1.5px]" style={{
              background: "linear-gradient(135deg, rgba(129,140,248,0.7) 0%, rgba(192,132,252,0.5) 50%, rgba(244,114,182,0.35) 100%)",
            }}>
              <div className="rounded-t-2xl overflow-hidden shadow-2xl shadow-black/60">
                <Image
                  src="/hero-photo.jpg"
                  alt="Guitarist using ChordSheetMaker on a laptop"
                  width={1536}
                  height={1024}
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="w-full object-cover max-h-[230px] sm:max-h-none"
                  style={{ objectPosition: "center 20%" }}
                />
              </div>
            </div>
            {/* Fade bottom of photo into section bg */}
            <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-40" style={{
              background: "linear-gradient(to bottom, transparent 0%, #1a1640 100%)",
            }} />
          </div>

          {/* Caption */}
          <p className="relative text-xs text-white/25 mb-8 sm:mb-12">
            A real chord chart in ChordSheetMaker — transposed and ready to perform
          </p>

          {/* 3 highlights — horizontal until md, then 3-column vertical */}
          <div className="relative w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: "⚡", title: "Any song, clean chart",   body: "Type a title and AI lays the chords over the lyrics, perfectly aligned — ready in seconds." },
              { icon: "🎚️", title: "In your singer's key",    body: "Transpose the whole chart up or down with one tap. No rewriting, no capo math."  },
              { icon: "▶️", title: "Hands-free on stage",     body: "Hit play and the chart scrolls at your pace. Keep both hands on your instrument." },
            ].map((h) => (
              <div key={h.title}
                className="group flex flex-row md:flex-col items-center gap-4 md:gap-0 text-left md:text-center px-4 md:px-6 py-4 md:py-8 rounded-2xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-lg hover:shadow-indigo-900/40"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <span className="text-3xl md:text-4xl md:mb-4 shrink-0">{h.icon}</span>
                <div>
                  <h3 className="font-bold text-white mb-1 md:mb-2 text-sm md:text-base">{h.title}</h3>
                  <p className="text-xs md:text-sm text-white/50 leading-relaxed">{h.body}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Features heading — inside the dark section so no hard cut */}
          <div id="features" className="relative w-full max-w-6xl mx-auto pt-12 sm:pt-16 pb-2">
            <span className="block text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-white mb-3 tracking-tight">
              Everything you need on stage
            </h2>
            <p className="text-center text-white/40 mb-0 max-w-xl mx-auto text-base sm:text-lg">
              Built for musicians who play live — focus on the performance, not the formatting.
            </p>
          </div>
        </section>

        {/* ── Features cards — light background ────────────────────────────── */}
        <section className="px-4 sm:px-6 pt-8 sm:pt-10 pb-10 sm:pb-12" style={{ background: "linear-gradient(180deg, #f8f7ff 0%, #f0efff 100%)" }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Transformation ───────────────────────────────────────────────── */}
        <TransformationSection />

        {/* ── Examples ─────────────────────────────────────────────────────── */}
        <ExamplesSection />

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="relative px-4 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-16 overflow-hidden" style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}>
          {/* Radial glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)",
          }} />
          <div className="relative max-w-5xl mx-auto">
            <span className="block text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-white mb-3 tracking-tight">Plans &amp; pricing</h2>
            <p className="text-center text-zinc-400 mb-8 sm:mb-12">Start free. Upgrade when you&apos;re ready.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 max-w-4xl mx-auto">
              {PLAN_ORDER.map((planKey) => {
                const plan = PLANS[planKey];
                const isPopular = planKey === "yearly";
                const isFree = planKey === "free";
                return (
                  <div
                    key={planKey}
                    className={`relative bg-white rounded-2xl flex flex-col overflow-hidden shadow-sm sm:min-h-[480px] ${
                      isPopular
                        ? "ring-2 ring-indigo-500 shadow-indigo-100 shadow-md"
                        : "border border-zinc-200"
                    }`}
                  >
                    {/* Top banner — always rendered so content aligns across all cards */}
                    {isPopular ? (
                      <div className="bg-indigo-500 text-white text-xs font-bold tracking-wide text-center py-1.5 uppercase">
                        Most popular
                      </div>
                    ) : (
                      <div className="text-xs font-bold tracking-wide text-center py-1.5 uppercase invisible" aria-hidden>&nbsp;</div>
                    )}

                    <div className="px-6 pt-6 pb-4 text-center sm:text-left">
                      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">{plan.name}</h2>

                      {/* Price row — fixed height */}
                      <div className="h-11 flex items-end gap-2 justify-center sm:justify-start">
                        {isFree ? (
                          <span className="text-4xl font-extrabold text-zinc-900">Free</span>
                        ) : (
                          <>
                            <div className="flex items-end gap-1">
                              <span className="text-4xl font-extrabold text-zinc-900">${plan.price}</span>
                              <span className="text-zinc-400 text-sm mb-1">{planKey === "monthly" ? "/mo" : "/yr"}</span>
                            </div>
                            {planKey === "yearly" && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full whitespace-nowrap mb-1">Save 27%</span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Description — fixed height, single line */}
                      <div className="h-6 flex items-center mt-1 justify-center sm:justify-start">
                        <p className="text-xs text-zinc-400">{plan.description}</p>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-zinc-100 flex-1 flex flex-col items-center sm:items-start">
                      <ul className="space-y-2.5 w-full max-w-[240px] sm:max-w-none">
                        {Object.keys(FEATURE_LABELS).filter((key) => {
                          const val = plan.features[key as keyof typeof plan.features];
                          const active = val !== false && val !== 0;
                          return isFree ? true : active;
                        }).map((key) => {
                          const label = FEATURE_LABELS[key];
                          const val = plan.features[key as keyof typeof plan.features];
                          const active = val !== false && val !== 0;
                          return (
                            <li key={key} className={`flex items-center gap-2.5 text-sm ${active ? "text-zinc-700" : "text-zinc-300"}`}>
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                                active ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-300"
                              }`}>
                                {active ? "✓" : "—"}
                              </span>
                              {key === "songLimit"
                                ? val === true ? "Unlimited songs" : `Up to ${val} songs`
                                : label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="px-6 pb-6 pt-4 border-t border-zinc-100 space-y-2">
                      <Link
                        href={isFree ? "/songs" : "/pricing"}
                        className={`block w-full text-center py-2.5 rounded-full text-sm font-semibold transition-colors ${
                          isPopular
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                            : isFree
                            ? "border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                            : "bg-zinc-900 text-white hover:bg-zinc-700"
                        }`}
                      >
                        {isFree ? "Try it free" : "Start 7-day free trial →"}
                      </Link>
                      {!isFree && (
                        <p className="text-center text-[11px] text-zinc-400">
                          7 days free · then {planKey === "monthly" ? "$9/mo" : "$79/yr"} · cancel anytime
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-white/30 mt-8">
              Secure payments via Stripe · Cancel anytime · No hidden fees
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div style={{ background: "rgba(99,102,241,0.25)", height: 1 }} />
        <section
          className="relative px-5 sm:px-6 py-16 sm:py-28 text-center overflow-hidden"
          style={{ background: "linear-gradient(180deg, #1e1b4b 0%, #0f0c29 100%)" }}
        >
          {/* Radial glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 80%, rgba(99,102,241,0.3) 0%, transparent 70%)",
          }} />

          {/* Floating decorative notes */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
            {[
              { ch: "♩", top: "22%", left: "7%",   size: 52, opacity: 0.12 },
              { ch: "♫", top: "58%", left: "4%",   size: 68, opacity: 0.09 },
              { ch: "♪", top: "35%", right: "6%",  size: 46, opacity: 0.10 },
              { ch: "♬", top: "68%", right: "8%",  size: 64, opacity: 0.09 },
              { ch: "♩", top: "15%", right: "20%", size: 36, opacity: 0.07 },
              { ch: "♫", top: "78%", left: "18%",  size: 40, opacity: 0.07 },
            ].map((n, i) => (
              <span key={i} className="absolute text-white" style={{
                top: n.top,
                left: "left" in n ? n.left : undefined,
                right: "right" in n ? n.right : undefined,
                fontSize: n.size,
                opacity: n.opacity,
                transform: `rotate(${i % 2 === 0 ? -15 : 12}deg)`,
              }}>{n.ch}</span>
            ))}
          </div>

          <div className="relative max-w-2xl mx-auto">
            <span className="inline-block bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-indigo-500/30">
              Free to use
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight leading-tight">
              Your songs deserve<br />a better home.
            </h2>
            <p className="text-zinc-400 mb-10 max-w-md mx-auto leading-relaxed text-lg">
              Build, transpose and perform your chord charts — from any device, any stage.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaLink
                from="home-bottom"
                href={session ? "/songs" : "/editor/new?start=demo"}
                className="relative overflow-hidden group inline-flex items-center gap-2 text-white px-10 py-4 rounded-full text-base font-semibold transition-all duration-300 shadow-xl shadow-indigo-900/60 hover:shadow-indigo-500/50 hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)" }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)" }} />
                <span className="relative">{session ? "Go to my songs" : "Try it free"}</span>
                <svg className="relative w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </CtaLink>
              {!session && (
                <Link href="/pricing" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                  See pricing
                </Link>
              )}
            </div>
            {!session && (
              <p className="mt-4 text-xs text-white/30">No credit card required · Free forever plan available</p>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0f0c29" }} className="border-t border-white/5 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-sm font-extrabold tracking-tight text-white/70" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-400">Maker</span>
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/30">
            <Link href="#features" className="hover:text-white/60 transition-colors">Features</Link>
            <Link href="#pricing"  className="hover:text-white/60 transition-colors">Pricing</Link>
            <Link href="/songs"    className="hover:text-white/60 transition-colors">App</Link>
            <Link href="/terms"    className="hover:text-white/60 transition-colors">Terms</Link>
            <a href="mailto:claes@clavos.se" className="hover:text-white/60 transition-colors">Contact</a>
          </nav>
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} ChordSheetMaker.ai — Built for musicians
          </p>
        </div>
        <div className="max-w-5xl mx-auto mt-4 text-center sm:text-right">
          <BuildStamp className="text-[10px] text-white/15 font-mono" />
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
