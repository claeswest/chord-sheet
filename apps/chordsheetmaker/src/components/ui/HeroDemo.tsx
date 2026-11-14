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

// The sheet's colour at its top edge: behind the image while it loads, and
// what the top fade fades from. The image's bottom edge is blended into the
// same colour (step 5 above), which is what hides the loop's seam.
const SHEET_TOP = "#e3e3db";

// The viewer's two kinds of control, as class strings.
const GHOST = "flex items-center rounded-lg border border-white/20 px-2.5 py-1.5 text-white/70 backdrop-blur-sm";
const SQUARE = "flex h-7 w-7 items-center justify-center rounded border border-white/20 text-sm text-white/70";

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
        {/* Fade at the top so the sheet arrives rather than appears */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-10"
          style={{ background: `linear-gradient(to bottom, ${SHEET_TOP} 0%, transparent 100%)` }}
        />

        {/* Play-mode controls — a still copy of the real viewer's bar
            (SongViewer's "Controls overlay"), at the size it has on a narrow
            screen: same gradient over the sheet, same buttons in the same
            order. If that bar changes, change this with it; the caption
            beside the hero says this is how play mode looks. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="absolute inset-x-0 bottom-0 -top-16 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="relative flex items-center justify-center gap-2.5 px-3 py-4">
            <div className="flex items-center gap-2">
              {/* Hide chords */}
              <span className={GHOST}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </span>
              {/* PDF */}
              <span className={GHOST}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2h10l4 4v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
                  <polyline points="15 2 15 7 20 7" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <polyline points="9 14 12 17 15 14" />
                </svg>
              </span>
              {/* Playing, so the button shows pause */}
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink shadow-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="5" y="4" width="3" height="12" rx="1" /><rect x="12" y="4" width="3" height="12" rx="1" />
                </svg>
              </span>
            </div>

            <div className="flex items-center gap-2.5 border-l border-white/20 pl-2.5">
              {/* Speed */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-right text-xs tabular-nums text-white/50">3</span>
                <span className="relative h-1 w-16 rounded-full bg-white/30 sm:w-20">
                  <span className="absolute inset-y-0 left-0 w-[22%] rounded-full bg-white" />
                  <span className="absolute left-[22%] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
                </span>
              </div>
              {/* Text size */}
              <div className="flex items-center gap-1">
                <span className={SQUARE}>A−</span>
                <span className={SQUARE}>A+</span>
              </div>
              {/* Key */}
              <div className="hidden items-center gap-1 sm:flex">
                <span className={SQUARE}>−</span>
                <span className="px-1 text-xs text-white/50">Key</span>
                <span className={SQUARE}>+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
