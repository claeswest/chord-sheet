import Link from "next/link";
import ScrollToTop from "@/components/ui/ScrollToTop";

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

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 max-w-6xl mx-auto w-full">
        <span className="text-xl font-bold tracking-tight text-zinc-900">
          ChordSheet<span className="text-indigo-600">Maker</span>
        </span>
        <nav className="flex items-center gap-6 text-sm text-zinc-600">
          <Link href="#features" className="hover:text-zinc-900 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-zinc-900 transition-colors">
            Pricing
          </Link>
          <Link
            href="/login"
            className="hover:text-zinc-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Get started free
          </Link>
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
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-zinc-900 mb-4">
              Simple pricing
            </h2>
            <p className="text-center text-zinc-500 mb-16">
              Start free. Upgrade when you need more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Free */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-8">
                <h3 className="font-bold text-xl text-zinc-900 mb-1">Free</h3>
                <p className="text-zinc-400 text-sm mb-6">For casual players</p>
                <div className="text-4xl font-extrabold text-zinc-900 mb-8">
                  $0
                  <span className="text-base font-normal text-zinc-400"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-zinc-600 mb-8">
                  {[
                    "Full chord sheet editor",
                    "AI-assisted import",
                    "Auto-scroll view mode",
                    "Up to 20 saved songs",
                    "PDF export (watermarked)",
                    "Ad-supported",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block text-center border border-zinc-200 text-zinc-700 px-6 py-3 rounded-full font-medium hover:bg-zinc-50 transition-colors"
                >
                  Get started
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-indigo-600 rounded-2xl border border-indigo-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </div>
                <h3 className="font-bold text-xl mb-1">Pro</h3>
                <p className="text-indigo-200 text-sm mb-6">For serious musicians</p>
                <div className="text-4xl font-extrabold mb-8">
                  $4.99
                  <span className="text-base font-normal text-indigo-300"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-indigo-100 mb-8">
                  {[
                    "Everything in Free",
                    "Unlimited saved songs",
                    "No watermarks on exports",
                    "Ad-free experience",
                    "Chord transposition",
                    "Priority AI processing",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-white">✓</span> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="block text-center bg-white text-indigo-600 px-6 py-3 rounded-full font-medium hover:bg-indigo-50 transition-colors"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 text-center">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Ready to play?
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            Join musicians who use ChordSheetMaker to create, organise, and
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
        © {new Date().getFullYear()} ChordSheetMaker.com — Built for musicians
      </footer>

      <ScrollToTop />
    </div>
  );
}
