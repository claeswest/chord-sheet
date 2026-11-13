"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import CtaLink from "./CtaLink";

const IMAGES = [
  { src: "/BurningGold.jpeg", label: "BEFORE", alt: "Handwritten chord sheet for Burning Gold on a notepad" },
  { src: "/BurningGold_CSM.png", label: "AFTER", alt: "Burning Gold chord sheet styled in ChordSheetMaker with AI background" },
];

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
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-4">Photo import</p>
        <h2 className="font-display font-medium text-4xl sm:text-5xl tracking-[-0.02em] text-ink mb-3">
          Go from this to this — in 30 seconds
        </h2>
        <p className="text-lg text-stone-600 mb-10 sm:mb-14 max-w-xl leading-relaxed">
          Snap a photo of any handwritten chord sheet. AI reads it and turns it into a polished, play-ready version.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          {/* Before */}
          <div className="flex-1 w-full flex flex-col gap-2">
            <button
              onClick={() => setLightboxIndex(0)}
              className="relative rounded-lg overflow-hidden border border-ink/15 cursor-zoom-in group w-full text-left"
            >
              <span className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-ink/80 text-white px-2 py-1 rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm0 0l1 1"/><path strokeLinecap="round" strokeLinejoin="round" d="M11 8v6M8 11h6"/></svg>
                  Zoom
                </span>
              </span>
              <div className="relative aspect-[4/3]">
                <Image
                  src="/BurningGold.jpeg"
                  alt="Handwritten chord sheet for Burning Gold on a notepad"
                  fill
                  sizes="(max-width: 640px) 100vw, 430px"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            </button>
            <p className="font-mono text-[11px] text-stone-500"><span className="uppercase tracking-[0.18em] text-ink">Before</span> — your photo</p>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center shrink-0 sm:mb-6">
            <svg aria-hidden className="w-8 h-8 text-ink rotate-90 sm:rotate-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>

          {/* After */}
          <div className="flex-1 w-full flex flex-col gap-2">
            <button
              onClick={() => setLightboxIndex(1)}
              className="relative rounded-lg overflow-hidden border border-ink/15 cursor-zoom-in group w-full text-left"
              style={{ boxShadow: "0 26px 46px -28px rgba(28,25,23,0.5)" }}
            >
              <span className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-ink/80 text-white px-2 py-1 rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm0 0l1 1"/><path strokeLinecap="round" strokeLinejoin="round" d="M11 8v6M8 11h6"/></svg>
                  Zoom
                </span>
              </span>
              <div className="relative aspect-[4/3]">
                <Image
                  src="/BurningGold_CSM.png"
                  alt="Burning Gold chord sheet styled in ChordSheetMaker with AI background"
                  fill
                  sizes="(max-width: 640px) 100vw, 430px"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            </button>
            <p className="font-mono text-[11px] text-stone-500"><span className="uppercase tracking-[0.18em] text-chord">After</span> — ChordSheetMaker output</p>
          </div>
        </div>

        <div className="mt-10 sm:mt-12">
          {/* Straight to the import dialog — the button promises exactly that. */}
          <CtaLink from="home-photo" href="/editor/new?start=import" className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-paper hover:bg-stone-700 px-7 py-3.5 text-[15px] font-semibold transition-colors">
            Try it with your own sheet <span aria-hidden>→</span>
          </CtaLink>
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
            {/* Optimised by next/image: the AFTER original is a 1.3 MB PNG. */}
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
