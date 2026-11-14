import Image from "next/image";
import CtaLink from "./CtaLink";
import { EXAMPLE_SONGS } from "@/data/exampleSongs";

// Live examples — each card opens the song in play mode, where a visitor can
// press play and feel the auto-scroll. The songs are originals written for
// this site (src/data/exampleSources.ts), so no one else's lyrics are shown.
//
// The previews are real screenshots of those pages, not mock-ups. Retake them
// whenever a song's look or the viewer's design changes: load
// /examples/<slug> at 860x592, 2x, hide the viewer's top and bottom bars, and
// save it under a new name by raising the song's `rev` in exampleSources.ts.

/** The three cards on their own, for pages that bring their own heading. */
export function ExampleCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-7">
      {EXAMPLE_SONGS.map((ex, i) => (
        <a key={ex.slug} href={ex.href} target="_blank" rel="noopener" className="group block">
          <div
            className="relative aspect-[860/592] overflow-hidden rounded-lg border border-ink/15 bg-stone-100"
            style={{ boxShadow: "0 22px 40px -26px rgba(28,25,23,0.45)" }}
          >
            <Image
              src={ex.img}
              alt={`${ex.title}, an example chord sheet made with ChordSheetMaker`}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {/* In the corner, so it says "this plays" without covering the sheet. */}
            <span className="absolute left-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-ink/90 py-1.5 pl-2.5 pr-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-paper transition-colors group-hover:bg-ink">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path d="M6.3 4.2a1 1 0 0 0-1.3.95v9.7a1 1 0 0 0 1.3.95l9-4.85a1 1 0 0 0 0-1.9L6.3 4.2z" />
              </svg>
              Play
            </span>
          </div>

          <div className="pt-4">
            {/* "Synth-pop · original" → the genre; the card says the rest itself. */}
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">
              <span className="text-chord">{String(i + 1).padStart(2, "0")}</span>
              <span className="mx-2 text-stone-400">/</span>
              {ex.artist.split(" · ")[0]}
            </p>
            <p className="mt-1.5 font-display font-medium text-2xl leading-snug tracking-[-0.01em] text-ink underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-ink/40">
              {ex.title}
            </p>
            <p className="mt-1 text-sm text-stone-600">{ex.vibe}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function ExamplesSection() {
  return (
    <section id="examples" className="bg-paper-deep border-b border-rule scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 lg:gap-16 lg:items-end mb-10 sm:mb-14">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-4">Made with ChordSheetMaker</p>
            <h2 className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.02em] text-ink text-balance">Your sheets can look like this</h2>
          </div>
          <p className="text-lg text-stone-600 leading-relaxed lg:pb-1.5">
            Three original songs. For each, the AI read the lyrics, chose the fonts and made the
            picture behind them. Open one and press{" "}
            <strong className="font-semibold text-ink">play</strong> to feel the auto-scroll.
          </p>
        </div>

        <ExampleCards />

        <div className="mt-12 sm:mt-14 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink/15 pt-8">
          <CtaLink from="home-examples" href="/songs" className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-paper hover:bg-stone-700 px-7 py-3.5 text-[15px] font-semibold transition-colors">
            Create yours for free <span aria-hidden>→</span>
          </CtaLink>
          <p className="text-sm text-stone-600">No account needed to start.</p>
        </div>
      </div>
    </section>
  );
}
