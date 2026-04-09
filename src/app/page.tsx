import Link from "next/link";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { auth } from "@/lib/auth";
import { PLANS, type Plan } from "@/lib/plans";

const PLAN_ORDER: Plan[] = ["free", "monthly", "yearly", "lifetime"];
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
    title: "AI Song Search",
    description: "Type a song name and artist — AI knows millions of songs and returns a ready-to-use chord sheet in seconds.",
  },
  {
    icon: "🎸",
    title: "Drag-and-Drop Chords",
    description: "Grab any chord and drop it above the exact lyric syllable where the change happens. No manual spacing.",
  },
  {
    icon: "📷",
    title: "Photo & Image Import",
    description: "Snap a photo of a paper chord sheet. AI reads it and turns it into a fully editable digital sheet.",
  },
  {
    icon: "🎨",
    title: "AI Background & Styling",
    description: "Generate atmospheric background images matched to your song's mood — abstract, landscape, vintage, concert and more.",
  },
  {
    icon: "▶️",
    title: "Auto-Scroll Performance Mode",
    description: "Hands-free teleprompter scroll at the exact speed you need. Control with keyboard — perfect on stage.",
  },
  {
    icon: "📄",
    title: "Print & PDF Export",
    description: "Print straight from the browser or export a clean PDF. Organize songs into setlists for your gigs.",
  },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-full bg-white">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <span className="text-xl font-extrabold tracking-tight text-zinc-900" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-600">Maker</span>
          </span>
          <nav className="flex items-center gap-6 text-sm text-zinc-600">
            <Link href="#features" className="hover:text-zinc-900 transition-colors hidden sm:block">Features</Link>
            <Link href="#pricing"  className="hover:text-zinc-900 transition-colors hidden sm:block">Pricing</Link>
            {session ? (
              <Link href="/songs" className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors">
                Songs
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-zinc-900 transition-colors">Sign in</Link>
                <Link href="/songs" className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Get started free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="relative flex flex-col items-center text-center px-6 pt-24 pb-0 overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          }}
        >
          {/* Subtle radial glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.25) 0%, transparent 70%)",
          }} />

          <span className="relative inline-block bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-indigo-500/30">
            For guitarists, pianists, vocalists & bands
          </span>

          <h1 className="relative text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight mb-6 max-w-4xl">
            Chord sheets,{" "}
            <span className="text-indigo-400">done right</span>
          </h1>

          <p className="relative text-lg sm:text-xl text-zinc-300 max-w-2xl mb-10 leading-relaxed">
            Search any song with AI, drag chords above lyrics, style with generated backgrounds,
            and perform with hands-free auto-scroll — all in your browser.
          </p>

          <div className="relative flex flex-col sm:flex-row gap-4 mb-16">
            <Link
              href="/songs"
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-4 rounded-full text-base font-semibold transition-colors shadow-lg shadow-indigo-900/50"
            >
              Start for free
            </Link>
            <Link
              href="#features"
              className="border border-white/20 text-white/80 hover:text-white hover:border-white/40 px-8 py-4 rounded-full text-base font-semibold transition-colors backdrop-blur-sm"
            >
              See how it works
            </Link>
          </div>

          {/* Hero photo */}
          <div className="relative w-full max-w-3xl mx-auto">
            <div className="rounded-t-2xl overflow-hidden shadow-2xl shadow-black/60">
              <img
                src="/hero-photo.jpg"
                alt="Guitarist using ChordSheetMaker on a laptop"
                className="w-full object-cover"
                style={{ maxHeight: 480 }}
              />
            </div>
            {/* Fade bottom edge into section background */}
            <div className="absolute bottom-0 left-0 right-0 h-24" style={{
              background: "linear-gradient(to bottom, transparent 0%, #24243e 100%)",
            }} />
          </div>
        </section>

        {/* Caption */}
        <p className="text-center text-xs text-zinc-400 mt-3 mb-16 px-4">
          Real chord sheet created in ChordSheetMaker — background image and styling generated with AI
        </p>

        {/* ── 3 quick highlights ──────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "⚡", title: "Instant AI import", body: "Search a song name and get a complete chord sheet in seconds — no copying, no pasting." },
              { icon: "🎯", title: "Precise chord placement", body: "Drag chords to the exact syllable. What you see in the editor is what you perform." },
              { icon: "🎤", title: "Built for the stage", body: "Auto-scroll teleprompter mode with keyboard speed control keeps your hands free." },
            ].map((h) => (
              <div key={h.title} className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-50 border border-zinc-100">
                <span className="text-3xl mb-3">{h.icon}</span>
                <h3 className="font-semibold text-zinc-900 mb-2 text-sm">{h.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 mb-3">
            Everything you need
          </h2>
          <p className="text-center text-zinc-400 mb-16 max-w-xl mx-auto">
            Built for musicians who want to focus on playing, not formatting.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white rounded-2xl p-6 border border-zinc-100 hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-xl mb-4 group-hover:bg-indigo-100 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="px-6 py-24" style={{ background: "linear-gradient(180deg, #f8f8ff 0%, #ffffff 100%)" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-zinc-900 mb-3">Simple pricing</h2>
            <p className="text-center text-zinc-400 mb-16">Start free. Upgrade when you need more.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLAN_ORDER.map((planKey) => {
                const plan = PLANS[planKey];
                const isPopular = planKey === "yearly";
                return (
                  <div
                    key={planKey}
                    className={`relative bg-white rounded-2xl border p-6 flex flex-col shadow-sm ${
                      isPopular ? "border-indigo-500 ring-2 ring-indigo-500 shadow-indigo-100 shadow-md" : "border-zinc-200"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        Most popular
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                      <div className="mt-2 flex items-end gap-1">
                        <span className="text-3xl font-bold text-zinc-900">${plan.price}</span>
                        {planKey === "monthly"  && <span className="text-zinc-400 text-sm mb-1">/mo</span>}
                        {planKey === "yearly"   && <span className="text-zinc-400 text-sm mb-1">/yr</span>}
                        {planKey === "lifetime" && <span className="text-zinc-400 text-sm mb-1"> once</span>}
                      </div>
                      <p className="text-zinc-400 text-sm mt-1">{plan.description}</p>
                    </div>
                    <ul className="space-y-2 flex-1 mb-6 text-sm">
                      {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                        const val = plan.features[key as keyof typeof plan.features];
                        const active = val !== false && val !== 0;
                        return (
                          <li key={key} className={`flex items-center gap-2 ${active ? "text-zinc-700" : "text-zinc-300"}`}>
                            <span className={`w-4 text-center font-semibold ${active ? "text-indigo-500" : ""}`}>
                              {val === true ? "✓" : val === false ? "—" : String(val)}
                            </span>
                            <span>{key === "songLimit" ? (val === true ? "Unlimited songs" : `Up to ${val} songs`) : label}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <Link
                      href={planKey === "free" ? "/songs" : "/pricing"}
                      className={`block text-center px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                        isPopular
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : planKey === "free"
                          ? "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                          : "bg-zinc-900 text-white hover:bg-zinc-700"
                      }`}
                    >
                      {planKey === "free" ? "Get started free" : "Upgrade"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="px-6 py-24 text-center" style={{
          background: "linear-gradient(160deg, #0f0c29 0%, #302b63 100%)",
        }}>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to play?
          </h2>
          <p className="text-zinc-400 mb-10 max-w-md mx-auto leading-relaxed">
            Join musicians who use ChordSheetMaker to create, organise, and perform their songs.
          </p>
          <Link
            href="/songs"
            className="inline-block bg-indigo-500 hover:bg-indigo-400 text-white px-10 py-4 rounded-full text-base font-semibold transition-colors shadow-lg shadow-indigo-900/50"
          >
            Create your first chord sheet →
          </Link>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-100 px-6 py-8 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} ChordSheetMaker.ai — Built for musicians
      </footer>

      <ScrollToTop />
    </div>
  );
}
