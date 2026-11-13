// FAQ — native <details> accordion (no JS) + FAQPage JSON-LD for rich results.

import { getSongLimit } from "@/lib/plans";

const FREE_SONGS = getSongLimit("free");

const FAQS = [
  {
    q: "Do I need an account to try it?",
    a: "No — you can build charts right away and they're saved on your device. Create a free account (one click with Google or email) when you want your songs synced across devices.",
  },
  {
    q: "What happens after the 7-day free trial?",
    a: `The trial converts to your chosen plan unless you cancel — and you can cancel anytime during the trial with one click, at no charge. If you drop back to the free plan you keep your ${FREE_SONGS} most recent songs.`,
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
    q: "Can I organise songs into setlists?",
    a: "Yes — group songs into folders: setlists for gigs, or collections like 'Campfire' or 'Sunday practice' for playing at home. Drag songs in and put them in the order you want to play them.",
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
    <section id="faq" className="bg-paper-deep border-t border-rule scroll-mt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24 grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-8 lg:gap-16">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-4">FAQ</p>
          <h2 className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.02em] text-ink">
            Common questions
          </h2>
        </div>
        <div className="border-b border-ink/15">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group border-t border-ink/15"
            >
              <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none text-base sm:text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg
                  className="w-4 h-4 shrink-0 text-stone-500 transition-transform duration-200 group-open:rotate-180"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="pb-6 -mt-1 pr-8 text-[15px] text-stone-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
