// Hero visual: a real chord sheet auto-scrolling on its own — the product
// demoing its signature feature. The image is an actual screenshot of the
// public "Wildflowers" share page, not a mock-up, so the hero shows exactly
// what the app produces: AI background, serif typesetting, chords sitting
// over the right syllables.
//
// Regenerating /public/hero-sheet.jpg (do this whenever the viewer's design
// changes, or the hero will quietly keep showing the old look):
//   1. npm run dev
//   2. Load /share/cmr9hfayp000204ksybupx8cp at a 430x1900 viewport
//   3. Hide the viewer chrome — the top bar (logo + "Make your own"), the
//      bottom control bar, and the Next.js dev badge
//   4. Capture full-page at 2x device scale factor, save as JPEG
// The 430x1900 viewport is deliberate on both axes: 430 is roughly the width
// the hero actually renders at, so the lyrics aren't downscaled into mush,
// and 1900 ends just past the last line — enough field for the loop to
// breathe, not so much that it reads as a gap.

import Image from "next/image";

// Sheet colours at the very top and bottom of the image. The fades use these
// so the loop seam — bottom of one copy meeting the top of the next — is
// invisible rather than a visible band.
const SHEET_TOP = "#f1f4ef";
const SHEET_BOTTOM = "#e9ebe3";

function Sheet() {
  return (
    <Image
      src="/hero-sheet.jpg"
      alt=""
      width={430}
      height={1900}
      priority
      draggable={false}
      className="block w-full h-auto select-none"
    />
  );
}

export default function HeroDemo() {
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: SHEET_TOP }}>
      {/* Auto-scrolling sheet (duplicated so the -50% loop is seamless) */}
      <div className="relative h-[260px] sm:h-[340px] overflow-hidden" aria-hidden>
        <div className="hero-scroll">
          <Sheet />
          <Sheet />
        </div>
        {/* Fades top/bottom so the loop reads as endless */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-10"
          style={{ background: `linear-gradient(to bottom, ${SHEET_TOP} 0%, transparent 100%)` }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-14"
          style={{ background: `linear-gradient(to top, ${SHEET_BOTTOM} 0%, transparent 100%)` }}
        />
      </div>

      {/* Play-mode control bar — mirrors the real viewer's dark bar over the sheet */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 py-3 bg-black/45 backdrop-blur-sm">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-900/50">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <rect x="5" y="4" width="3" height="12" rx="1" /><rect x="12" y="4" width="3" height="12" rx="1" />
          </svg>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/50">Slow</span>
          <span className="relative w-24 h-1 rounded-full bg-white/20">
            <span className="absolute left-[22%] -top-1 w-3 h-3 rounded-full bg-indigo-400 shadow" />
          </span>
          <span className="text-[10px] text-white/50">Fast</span>
        </div>
        <span className="text-[10px] text-white/50 font-mono hidden sm:inline">auto-scroll</span>
      </div>
    </div>
  );
}
