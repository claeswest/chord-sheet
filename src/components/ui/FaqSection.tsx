// FAQ — native <details> accordion (no JS) + FAQPage JSON-LD for rich results.

const FAQS = [
  {
    q: "Do I need an account to try it?",
    a: "No — you can build charts right away and they're saved on your device. Create a free account (one click with Google or email) when you want your songs synced across devices.",
  },
  {
    q: "What happens after the 7-day free trial?",
    a: "The trial converts to your chosen plan unless you cancel — and you can cancel anytime during the trial with one click, at no charge. If you drop back to the free plan you keep your five most recent songs.",
  },
  {
    q: "Does it work on stage, on a tablet or phone?",
    a: "Yes — ChordSheetMaker runs in any browser on any device. In play mode the chart auto-scrolls at your pace, text scales to your screen, and the screen stays awake so nothing interrupts the song.",
  },
  {
    q: "Can I transpose songs to my key?",
    a: "One tap moves the whole chart up or down a semitone — every chord updates instantly, no rewriting and no capo math. Transposition is free for everyone.",
  },
  {
    q: "Can I import chord sheets I already have?",
    a: "Yes. Paste text from anywhere, or snap a photo of a printed or handwritten sheet — AI reads it and turns it into a clean, editable chart in seconds.",
  },
  {
    q: "Can my bandmates use a chart without an account?",
    a: "Yes — send them a share link and it opens right in the browser, ready to play with auto-scroll. No account needed. A singer can even hide the chords and see just the lyrics.",
  },
  {
    q: "Is my music private?",
    a: "Completely. Your songs are visible only to you. If you want to share a chart with your band, you create a share link explicitly — nothing is ever public by default.",
  },
];

export default function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="px-5 sm:px-6 py-14 sm:py-20" style={{ background: "linear-gradient(180deg, #f0efff 0%, #f8f7ff 100%)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-2xl mx-auto">
        <span className="block text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">FAQ</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-zinc-800 mb-10 tracking-tight">
          Common questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-indigo-100 bg-white shadow-sm open:shadow-md open:shadow-indigo-100 transition-shadow"
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none text-sm sm:text-base font-semibold text-zinc-800 [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg
                  className="w-4 h-4 shrink-0 text-indigo-400 transition-transform duration-200 group-open:rotate-180"
                  fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="px-5 pb-4 -mt-1 text-sm text-zinc-500 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
