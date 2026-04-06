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
    icon: "🎸",
    title: "Drag-and-Drop Chords",
    description:
      "Grab any chord symbol and drop it above the exact lyric where the change happens. No manual spacing — it just works.",
  },
  {
    icon: "🤖",
    title: "AI-Assisted Import",
    description:
      "Paste lyrics and chords from anywhere. Our AI detects which lines are chords vs. lyrics and formats the sheet instantly.",
  },
  {
    icon: "📷",
    title: "Image & OCR Upload",
    description:
      "Snap a photo of a paper chord sheet and upload it. The AI reads the image and turns it into a fully editable digital sheet.",
  },
  {
    icon: "📜",
    title: "Section Headers",
    description:
      "Label your Intro, Verse, Chorus, Bridge and more. Drag section headers into place to keep your song organised.",
  },
  {
    icon: "▶️",
    title: "Auto-Scroll View Mode",
    description:
      "Switch to performance mode and let the song scroll hands-free at your chosen speed — perfect for stage and rehearsal.",
  },
  {
    icon: "📄",
    title: "PDF Export & Print",
    description:
      "Export a print-ready PDF or print straight from the browser. Upgrade to remove the watermark for clean, professional charts.",
  },
];

export default async function HomePage() {
  const session = await auth();
  return (
    <div className="flex flex-col min-h-full">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 max-w-6xl mx-auto w-full">
        <span className="text-xl font-bold tracking-tight text-zinc-900">
          ChordSheet<span className="text-indigo-600">Creator</span>
        </span>
        <nav className="flex items-center gap-6 text-sm text-zinc-600">
          <Link href="#features" className="hover:text-zinc-900 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-zinc-900 transition-colors">
            Pricing
          </Link>
          {session ? (
            <Link
              href="/songs"
              className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              My Songs
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-zinc-900 transition-colors">
                Sign in
              </Link>
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Get started free
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
          <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
            For guitarists, pianists, vocalists & bands
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 leading-tight mb-6">
            Chord sheets, done{" "}
            <span className="text-indigo-600">the right way</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-500 max-w-2xl mb-10 leading-relaxed">
            Create beautiful chord sheets in minutes. Drag chords above lyrics,
            import from text or a photo, and perform with hands-free auto-scroll
            — all in your browser.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/songs"
              className="bg-indigo-600 text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-indigo-700 transition-colors shadow-md"
            >
              Start for free
            </Link>
            <Link
              href="#features"
              className="border border-zinc-200 text-zinc-700 px-8 py-4 rounded-full text-base font-semibold hover:bg-zinc-50 transition-colors"
            >
              See how it works
            </Link>
          </div>
        </section>

        {/* Preview strip */}
        <section className="bg-zinc-50 border-y border-zinc-100 py-12 px-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 font-mono text-sm leading-8">
            <p className="text-xs font-sans font-semibold text-indigo-500 uppercase tracking-widest mb-4">
              Verse 1
            </p>
            <div className="text-zinc-400 text-xs mb-1 tracking-widest">
              <span className="mr-[4.5rem]">Am</span>
              <span className="mr-[3.5rem]">G</span>
              <span>C</span>
            </div>
            <p className="text-zinc-800">
              Hello darkness, my old friend,
            </p>
            <div className="text-zinc-400 text-xs mt-3 mb-1 tracking-widest">
              <span className="mr-[2rem]">Em</span>
              <span className="mr-[5rem]">Am</span>
              <span>G</span>
            </div>
            <p className="text-zinc-800">
              I&apos;ve come to talk with you again.
            </p>
            <p className="mt-6 text-xs font-sans font-semibold text-indigo-500 uppercase tracking-widest">
              Chorus
            </p>
            <div className="text-zinc-400 text-xs mt-1 mb-1 tracking-widest">
              <span className="mr-[1rem]">C</span>
              <span className="mr-[5rem]">G</span>
              <span>Am</span>
            </div>
            <p className="text-zinc-800">
              The sound of silence.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 mb-4">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-center text-zinc-500 mb-16 max-w-xl mx-auto">
            Built for musicians who want to focus on playing, not formatting.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-zinc-50 border-t border-zinc-100 px-6 py-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-zinc-900 mb-4">
              Simple pricing
            </h2>
            <p className="text-center text-zinc-500 mb-16">
              Start free. Upgrade when you need more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLAN_ORDER.map((planKey) => {
                const plan = PLANS[planKey];
                const isPopular = planKey === "yearly";
                return (
                  <div
                    key={planKey}
                    className={`relative bg-white rounded-2xl border p-6 flex flex-col shadow-sm ${
                      isPopular ? "border-indigo-500 ring-2 ring-indigo-500" : "border-zinc-200"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most popular
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                      <div className="mt-2 flex items-end gap-1">
                        <span className="text-3xl font-bold text-zinc-900">${plan.price}</span>
                        {planKey === "monthly" && <span className="text-zinc-400 text-sm mb-1">/mo</span>}
                        {planKey === "yearly" && <span className="text-zinc-400 text-sm mb-1">/yr</span>}
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
                            <span className="w-4 text-center">
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

        {/* CTA */}
        <section className="px-6 py-24 text-center">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Ready to play?
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            Join musicians who use ChordSheetCreator to create, organise, and
            perform their songs.
          </p>
          <Link
            href="/songs"
            className="inline-block bg-indigo-600 text-white px-10 py-4 rounded-full text-base font-semibold hover:bg-indigo-700 transition-colors shadow-md"
          >
            Create your first chord sheet
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-8 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} ChordSheetCreator.com — Built for musicians
      </footer>

      <ScrollToTop />
    </div>
  );
}
