"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const EXAMPLES = [
  { src: "/example1.png", title: "Hotel California", artist: "Eagles" },
  { src: "/example2.png", title: "Perfect", artist: "Ed Sheeran" },
];

export default function ExamplesSection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightbox = lightboxIndex !== null ? EXAMPLES[lightboxIndex] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxIndex(null); return; }
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i! + 1) % EXAMPLES.length);
      if (e.key === "ArrowLeft")  setLightboxIndex((i) => (i! - 1 + EXAMPLES.length) % EXAMPLES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  return (
    <section className="relative px-4 sm:px-6 py-14 sm:py-24 overflow-hidden" style={{ background: "linear-gradient(180deg, #f0efff 0%, #eae8ff 100%)" }}>
      <div className="relative max-w-5xl mx-auto">
        <span className="block text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Examples</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-zinc-800 mb-3 tracking-tight">See what you can create</h2>
        <p className="text-center text-zinc-500 mb-14 max-w-xl mx-auto text-lg leading-relaxed">Real chord sheets made with ChordSheetMaker — backgrounds, fonts and colours all customised with AI.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {EXAMPLES.map(({ src, title, artist }, i) => (
            <button
              key={title}
              onClick={() => setLightboxIndex(i)}
              className="group relative transition-transform duration-300 hover:-translate-y-2 text-left cursor-zoom-in w-full"
            >
              {/* Soft shadow halo */}
              <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl"
                style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
              {/* Card */}
              <div className="relative rounded-2xl overflow-hidden border border-indigo-100 shadow-xl shadow-indigo-200/50 transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-indigo-300/50">
                {/* Browser chrome bar */}
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  <span className="flex-1 mx-3 text-center text-[10px] text-white/25 font-mono truncate tracking-wide">chordsheetmaker.ai</span>
                </div>
                {/* Screenshot */}
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={src}
                    alt={`${title} by ${artist} — example chord sheet`}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                {/* Gradient overlay caption */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-5 py-5">
                  <p className="text-white font-bold text-base leading-tight">{title}</p>
                  <p className="text-white/55 text-sm">{artist}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/songs" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-full text-sm font-semibold transition-colors shadow-md shadow-indigo-200">
            Create yours for free →
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-16 cursor-zoom-out"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
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
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! - 1 + EXAMPLES.length) % EXAMPLES.length); }}
            className="absolute left-3 sm:left-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Image + label */}
          <div className="flex flex-col items-center gap-3 max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.src}
              alt={`${lightbox.title} by ${lightbox.artist}`}
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"
            />
            <div className="text-center">
              <p className="text-white font-semibold text-sm">{lightbox.title}</p>
              <p className="text-white/50 text-xs">{lightbox.artist}</p>
            </div>
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! + 1) % EXAMPLES.length); }}
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
