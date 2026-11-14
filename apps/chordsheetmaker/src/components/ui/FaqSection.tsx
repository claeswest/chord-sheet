// FAQ — native <details> accordion (no JS) + FAQPage JSON-LD for rich results.
//
// Every answer here is a claim about the product. Plan facts come from
// plans.ts; the rest were checked against the code when written — keep it so.

import { PLANS, getSongLimit } from "@/lib/plans";

const FREE_SONGS = getSongLimit("free");

// In the order a visitor asks them: can I try it, what does it do when I
// play, what does it cost.
const GROUPS: { label: string; items: { q: string; a: string }[] }[] = [
  {
    label: "Getting started",
    items: [
      {
        q: "Do I need an account to try it?",
        a: "No. Open the editor and start writing; your songs are saved in this browser. A free account, with Google or a link sent to your email, keeps them safe and brings them to your other devices.",
      },
      {
        q: "Can I bring in chord sheets I already have?",
        a: "Yes. Paste the text from a website or a document, or upload a photo of a printed or handwritten sheet, and it becomes a clean chart you can edit. You can also look a song up by artist and title.",
      },
      {
        q: "What does the AI do?",
        a: "Two things. It reads what you import, a photo or pasted text, and lays it out as a proper chart. And it can style a song: it reads the lyrics, chooses fonts and colours to suit, and makes a background picture. Both are optional and free, and you can change or undo whatever it does.",
      },
    ],
  },
  {
    label: "Playing",
    items: [
      {
        q: "Can I transpose a song to my key?",
        a: "Yes. One tap moves the whole chart up or down a semitone, and every chord is respelled for the new key, so you get B♭ rather than A♯ where B♭ belongs. In play mode you can change key for one run-through without touching the saved chart. Transposing is free.",
      },
      {
        q: "Does it work on stage, on a tablet or a phone?",
        a: "Yes. It runs in the browser on a phone, tablet or laptop, with nothing to install. Play mode scrolls the chart at the speed you set, lets you make the text as large as you need, and keeps the screen awake while you play.",
      },
      {
        q: "Can I organise songs into setlists?",
        a: "Yes. Make a folder for each gig, or for collections like “Campfire” or “Sunday practice”, drag songs into it and put them in playing order. A song can sit in more than one folder. Setlists are free.",
      },
      {
        q: "Can my bandmates use a chart without an account?",
        a: "Yes. On a paid plan you can make a share link for any song. It opens in their browser, ready to play with auto-scroll, and they need no account. A singer can hide the chords and read just the lyrics.",
      },
    ],
  },
  {
    label: "Plans & privacy",
    items: [
      {
        q: "What is free, and what does a paid plan add?",
        a: `Free gives you the whole editor for ${FREE_SONGS} songs: importing, transposing, AI styling, play mode and setlists. A paid plan adds unlimited songs, PDF export and share links, for $${PLANS.monthly.price} a month or $${PLANS.yearly.price} a year.`,
      },
      {
        q: "How does the 7-day free trial work?",
        a: `Paid plans start with seven days free. You add a card to begin, and nothing is charged until the trial ends; cancel before then from your account page and you pay nothing. If you go back to the free plan, no song is deleted: ${FREE_SONGS} stay open and the rest are locked until you subscribe again.`,
      },
      {
        q: "Is my music private?",
        a: "Yes. Your songs are visible only to you, and nothing is public unless you make a share link for it. When you use an AI feature, that song is sent to the AI service to do the job.",
      },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export default function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq" className="bg-paper-deep border-t border-rule scroll-mt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24 grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-4">FAQ</p>
          <h2 className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.02em] text-ink">
            Common questions
          </h2>
          <p className="mt-5 text-[15px] text-stone-600 leading-relaxed max-w-xs">
            Something else?{" "}
            <a
              href="mailto:claes@clavos.se"
              className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink transition-colors"
            >
              Write to us
            </a>{" "}
            and a person answers.
          </p>
        </div>

        <div className="space-y-10 sm:space-y-12">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500 pb-3">
                {g.label}
              </h3>
              <div className="border-b border-ink/15">
                {g.items.map((f) => (
                  <details key={f.q} className="group border-t border-ink/15">
                    <summary className="flex items-baseline justify-between gap-5 py-4 sm:py-5 cursor-pointer list-none font-display font-medium text-[1.2rem] sm:text-[1.35rem] leading-snug tracking-[-0.01em] text-ink [&::-webkit-details-marker]:hidden hover:text-chord group-open:text-chord transition-colors">
                      {f.q}
                      {/* A plus that loses its upright when the answer is open. */}
                      <span aria-hidden className="relative w-3.5 h-3.5 shrink-0 self-center text-stone-500 group-open:text-chord">
                        <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-current" />
                        <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-current transition-transform duration-200 group-open:scale-y-0" />
                      </span>
                    </summary>
                    <p className="pb-6 pr-8 max-w-[60ch] text-[15px] sm:text-base text-stone-700 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
