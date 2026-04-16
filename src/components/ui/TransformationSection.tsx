"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TransformationSection() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="relative px-4 sm:px-6 py-14 sm:py-20 overflow-hidden" style={{ background: "linear-gradient(180deg, #f0efff 0%, #eae8ff 100%)" }}>
      <div className="relative max-w-4xl mx-auto">
        <span className="block text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Photo import</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-zinc-800 mb-3 tracking-tight">
          Go from this to this — in 30 seconds
        </h2>
        <p className="text-center text-zinc-500 mb-10 sm:mb-14 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
          Snap a photo of any handwritten chord sheet. AI reads it and turns it into a polished, stage-ready version — instantly.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Before */}
          <div className="flex-1 w-full flex flex-col gap-2">
            <button
              onClick={() => setLightbox("/BurningGold.jpeg")}
              className="relative rounded-2xl overflow-hidden border border-zinc-200 shadow-xl cursor-zoom-in group w-full text-left"
            >
              <span className="absolute top-3 left-3 z-10 text-xs font-bold bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-sm tracking-wide">BEFORE</span>
              <span className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-black/60 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm0 0l1 1"/><path strokeLinecap="round" strokeLinejoin="round" d="M11 8v6M8 11h6"/></svg>
                  Zoom
                </span>
              </span>
              <div className="aspect-[4/3]">
                <img
                  src="/BurningGold.jpeg"
                  alt="Handwritten chord sheet for Burning Gold on a notepad"
                  className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </button>
            <p className="text-center text-xs text-zinc-400 font-medium">Your photo</p>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center shrink-0 mb-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6 text-white rotate-90 sm:rotate-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>

          {/* After */}
          <div className="flex-1 w-full flex flex-col gap-2">
            <button
              onClick={() => setLightbox("/BurningGold_CSM.png")}
              className="relative rounded-2xl overflow-hidden border border-indigo-300 shadow-xl cursor-zoom-in group w-full text-left"
              style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.3), 0 20px 40px -8px rgba(99,102,241,0.35)" }}
            >
              <span className="absolute top-3 left-3 z-10 text-xs font-bold bg-indigo-600/90 text-white px-3 py-1 rounded-full backdrop-blur-sm tracking-wide">AFTER</span>
              <span className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-indigo-600/80 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm0 0l1 1"/><path strokeLinecap="round" strokeLinejoin="round" d="M11 8v6M8 11h6"/></svg>
                  Zoom
                </span>
              </span>
              <div className="aspect-[4/3]">
                <img
                  src="/BurningGold_CSM.png"
                  alt="Burning Gold chord sheet styled in ChordSheetMaker with AI background"
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </button>
            <p className="text-center text-xs text-indigo-500 font-medium">ChordSheetMaker output</p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/songs" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-full text-sm font-semibold transition-colors shadow-md shadow-indigo-200">
            Try it with your own sheet →
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightbox}
            alt="Zoomed view"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
