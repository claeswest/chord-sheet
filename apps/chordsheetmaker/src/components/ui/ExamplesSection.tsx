"use client";

import Image from "next/image";
import CtaLink from "./CtaLink";

// Live examples — each card opens a real public share where visitors can hit
// play and feel the auto-scroll. The previews are actual screenshots of those
// share pages (captured at 860x592), so what you see is exactly what you get.

const EXAMPLES = [
  {
    href: "/share/cmr9haxoo000004ks4mcgmddi",
    img: "/examples/dansa-i-neon.jpg",
    title: "Dansa i Neon",
    artist: "Lena Philipsson",
    vibe: "Neon city — dark stage look",
  },
  {
    href: "/share/cmr9hfayp000204ksybupx8cp",
    img: "/examples/wildflowers.jpg",
    title: "Wildflowers",
    artist: "Tom Petty",
    vibe: "Watercolor sail — light & airy",
  },
  {
    href: "/share/cmr9hft4e000104jvpw9wc11v",
    img: "/examples/nothings-gonna-change.jpg",
    title: "Nothing's Gonna Change My Love For You",
    artist: "George Benson",
    vibe: "Lighthouse mist — jazz chords",
  },
];

export default function ExamplesSection() {
  return (
    <section id="examples" className="bg-paper-deep border-b border-rule scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-4">Made with ChordSheetMaker</p>
        <h2 className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.02em] text-ink mb-3">Your sheets can look like this</h2>
        <p className="text-lg text-stone-600 mb-10 sm:mb-14 max-w-2xl leading-relaxed">
          Three real charts, styled in minutes with AI backgrounds and fonts — no design skills
          needed. Open one, press <strong className="font-semibold text-ink">play</strong>, feel the
          auto-scroll — then make your own just like them.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {EXAMPLES.map((ex) => (
            <a
              key={ex.href}
              href={ex.href}
              target="_blank"
              rel="noopener"
              className="group flex text-left"
            >
              <div className="flex w-full flex-col">
                {/* Real screenshot of the share page */}
                <div
                  className="relative aspect-[16/11] overflow-hidden rounded-lg border border-ink/15 bg-stone-100"
                  style={{ boxShadow: "0 22px 40px -26px rgba(28,25,23,0.45)" }}
                >
                  <Image
                    src={ex.img}
                    alt={`${ex.title} chord sheet made with ChordSheetMaker`}
                    fill
                    sizes="(max-width: 768px) 100vw, 340px"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {/* Play affordance */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-ink/90 text-paper transition-transform duration-300 group-hover:scale-110">
                      <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 4.2a1 1 0 0 0-1.3.95v9.7a1 1 0 0 0 1.3.95l9-4.85a1 1 0 0 0 0-1.9L6.3 4.2z" /></svg>
                    </span>
                  </div>
                </div>

                {/* Caption */}
                <div className="flex flex-1 flex-col items-start gap-3 pt-4">
                  <div className="min-w-0">
                    <p className="font-display text-xl leading-snug text-ink break-words">{ex.title}</p>
                    <p className="text-sm text-stone-600">{ex.artist}</p>
                    <p className="mt-1.5 font-mono text-[11px] text-stone-500 leading-relaxed">{ex.vibe}</p>
                  </div>
                  <span className="mt-auto text-sm font-semibold text-ink underline underline-offset-4 decoration-ink/25 group-hover:decoration-ink transition-colors">Open &amp; play →</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 sm:mt-14">
          <CtaLink from="home-examples" href="/songs" className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-paper hover:bg-stone-700 px-7 py-3.5 text-[15px] font-semibold transition-colors">
            Create yours for free <span aria-hidden>→</span>
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
