"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import CtaLink from "./CtaLink";

// Before and after, and both are real. The photo is a page from a notepad.
// The sheet is what the app made of that photo: /api/ai/ocr read the title,
// the sections, the words and where each chord sits (3.8 seconds when it was
// measured), and one "Style it" chose the type and made the picture. Nothing
// was corrected by hand; only the artist's name was typed.
//
// The sheet lives at /examples/burning-gold (src/data/exampleSources.ts).
// Its picture here is a screenshot of that page at 720x576, 2x, with the
// viewer's bars hidden. Retake it when the viewer's design changes, under a
// new filename: images are cached by address.
const IMAGES = [
  { src: "/burning-gold-photo.jpg", label: "BEFORE", alt: "Handwritten chord sheet for Burning Gold on a notepad" },
  { src: "/examples/burning-gold.jpg", label: "AFTER", alt: "Burning Gold as a chord sheet in ChordSheetMaker, gold type over a city street at night" },
];

const ZOOM = (
  <span className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
    <span className="flex items-center gap-1 text-[10px] font-semibold bg-ink/80 text-white px-2 py-1 rounded">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M11 8v6M8 11h6"/></svg>
      Zoom
    </span>
  </span>
);

/** The corner tag that names each picture, like "Play" on the example cards. */
function Tag({ children, accent = false }: { children: string; accent?: boolean }) {
  return (
    <span className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${accent ? "bg-chord text-white" : "bg-ink/90 text-paper"}`}>
      {children}
    </span>
  );
}

export default function TransformationSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightbox = lightboxIndex !== null ? IMAGES[lightboxIndex] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxIndex(null); return; }
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i! + 1) % IMAGES.length);
      if (e.key === "ArrowLeft")  setLightboxIndex((i) => (i! - 1 + IMAGES.length) % IMAGES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  // The page behind must not scroll away under the open image.
  const open = lightboxIndex !== null;
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <section>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 lg:gap-16 lg:items-end mb-10 sm:mb-14">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-4">Photo import</p>
            <h2 className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.02em] text-ink text-balance">
              From this to this in under a minute
            </h2>
          </div>
          <p className="text-lg text-stone-600 leading-relaxed lg:pb-1.5">
            Snap a photo of a handwritten or printed chord sheet. The AI reads the words, the chords
            and where they sit. One more press gives it a look.
          </p>
        </div>

        {/* The two frames are the same height: 4:5 and 5:4 at these widths. */}
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.64fr)_auto_minmax(0,1fr)] items-start gap-5 sm:gap-6 lg:gap-9">
          {/* Before — a photograph, so it sits a little askew */}
          <figure>
            <button
              onClick={() => setLightboxIndex(0)}
              aria-label="Enlarge the photo of the handwritten sheet"
              className="group relative block w-full overflow-hidden rounded-lg border border-ink/15 cursor-zoom-in sm:-rotate-[1.25deg] sm:hover:rotate-0 transition-transform duration-300"
              style={{ boxShadow: "0 18px 34px -24px rgba(28,25,23,0.45)" }}
            >
              <Tag>Before</Tag>
              {ZOOM}
              <div className="relative aspect-[4/5]">
                <Image
                  src={IMAGES[0].src}
                  alt={IMAGES[0].alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  className="object-cover object-top"
                />
              </div>
            </button>
            <figcaption className="mt-3.5 text-sm text-stone-600">A page from a notepad, photographed on a table.</figcaption>
          </figure>

          {/* Arrow — level with the middle of the pictures, not of the captions */}
          <div aria-hidden className="flex items-center justify-center self-stretch sm:pb-12 text-ink">
            <svg className="h-7 w-7 rotate-90 sm:rotate-0 lg:h-9 lg:w-9" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 5.5L20 12m0 0l-6.5 6.5M20 12H3" />
            </svg>
          </div>

          {/* After */}
          <figure>
            <button
              onClick={() => setLightboxIndex(1)}
              aria-label="Enlarge the finished chord sheet"
              className="group relative block w-full overflow-hidden rounded-lg border border-ink/15 cursor-zoom-in"
              style={{ boxShadow: "0 26px 46px -28px rgba(28,25,23,0.5)" }}
            >
              <Tag accent>After</Tag>
              {ZOOM}
              <div className="relative aspect-[5/4]">
                <Image
                  src={IMAGES[1].src}
                  alt={IMAGES[1].alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 620px"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </button>
            <figcaption className="mt-3.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-stone-600">
              <span>Read in four seconds, styled in one press. Not a word corrected by hand.</span>
              <a
                href="/examples/burning-gold"
                target="_blank"
                rel="noopener"
                className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink transition-colors whitespace-nowrap"
              >
                Open this sheet →
              </a>
            </figcaption>
          </figure>
        </div>

        <div className="mt-10 sm:mt-12 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink/15 pt-8">
          {/* Straight to the import dialog — the button promises exactly that. */}
          <CtaLink from="home-photo" href="/editor/new?start=import" className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-paper hover:bg-stone-700 px-7 py-3.5 text-[15px] font-semibold transition-colors">
            Try it with your own sheet <span aria-hidden>→</span>
          </CtaLink>
          <p className="text-sm text-stone-600">Handwritten or printed. No account needed.</p>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${lightbox.label === "BEFORE" ? "Before" : "After"}: enlarged image`}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-16 cursor-zoom-out"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            autoFocus
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! - 1 + IMAGES.length) % IMAGES.length); }}
            className="absolute left-3 sm:left-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Image + label */}
          {/* A click anywhere closes — the image box is wider than the picture in it. */}
          <div className="flex flex-col items-center gap-3 w-full max-h-full">
            <div className="relative w-full max-w-5xl h-[80vh]">
              <Image
                src={lightbox.src}
                alt={lightbox.alt}
                fill
                sizes="(max-width: 1100px) 100vw, 1024px"
                className="object-contain drop-shadow-2xl"
              />
            </div>
            <span className="text-xs font-bold tracking-widest text-white/50 uppercase">{lightbox.label}</span>
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! + 1) % IMAGES.length); }}
            className="absolute right-3 sm:right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Next"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
