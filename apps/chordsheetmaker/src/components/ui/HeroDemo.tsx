// Hero visual: a real chord sheet auto-scrolling on its own — the product
// demoing its signature feature. The image is an actual screenshot of the
// "Salt and Clover" example page (an original song, see
// src/data/exampleSources.ts), not a mock-up, so the hero shows exactly what
// the app produces: AI background, serif typesetting, chords sitting over
// the right syllables.
//
// Regenerating /public/hero-salt-and-clover.jpg (do this whenever the viewer's design
// changes, or the hero will quietly keep showing the old look):
//   1. npm run dev
//   2. Load /examples/salt-and-clover at a 430x1835 viewport
//   3. Hide the viewer chrome — the top bar (logo + "Make your own"), the
//      bottom control bar, and the Next.js dev badge
//   4. Capture full-page at 2x device scale factor, save as JPEG
//   5. Fade the last 65px of the image into the colour of its top edge. The
//      picture is pale at the top and green at the bottom, and without this
//      the loop shows a hard line where one copy meets the next.
// The 430x1835 viewport is deliberate on both axes: 430 is roughly the width
// the hero actually renders at, so the lyrics aren't downscaled into mush,
// and 1835 ends just past the last line — enough field for the loop to
// breathe, not so much that it reads as a gap. If the height changes, change
// it on the <Image> below and re-sample the two colours.

import Image from "next/image";

// Sheet colours at the very top and bottom of the image. The fades use these
// so the loop seam — bottom of one copy meeting the top of the next — is
// invisible rather than a visible band.
const SHEET_TOP = "#e3e3db";
const SHEET_BOTTOM = "#e3e3db";

function Sheet() {
  return (
    <Image
      src="/hero-salt-and-clover.jpg"
      alt=""
      width={430}
      height={1835}
      priority
      draggable={false}
      className="block w-full h-auto select-none"
    />
  );
}

export default function HeroDemo() {
  return (
    <div
      className="relative rounded-xl overflow-hidden border border-ink/15"
      style={{ background: SHEET_TOP, boxShadow: "0 1px 0 rgba(28,25,23,0.04), 0 28px 50px -28px rgba(28,25,23,0.45)" }}
    >
      {/* Auto-scrolling sheet (duplicated so the -50% loop is seamless) */}
      <div className="relative h-[300px] sm:h-[400px] lg:h-[470px] overflow-hidden" aria-hidden>
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
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 py-3 bg-ink">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-paper text-ink">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <rect x="5" y="4" width="3" height="12" rx="1" /><rect x="12" y="4" width="3" height="12" rx="1" />
          </svg>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/60">Slow</span>
          <span className="relative w-24 h-1 rounded-full bg-white/20">
            <span className="absolute left-[22%] -top-1 w-3 h-3 rounded-full bg-paper" />
          </span>
          <span className="text-[10px] text-white/60">Fast</span>
        </div>
        <span className="text-[10px] text-white/60 font-mono hidden sm:inline">auto-scroll</span>
      </div>
    </div>
  );
}
