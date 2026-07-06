// Hero visual: a framed chart that auto-scrolls on its own — the product
// demoing its signature feature. Pure CSS animation (see .hero-scroll in
// globals.css), no video asset, always crisp, respects reduced motion.

const SHEET: { section?: string; chords?: [string, number][]; text?: string }[] = [
  { section: "Verse 1" },
  { chords: [["Am", 0], ["G", 55]], text: "Walking down the road at night" },
  { chords: [["Am", 0], ["F", 38], ["G", 62]], text: "Looking for a guiding light" },
  { chords: [["C", 0], ["G", 42], ["Am", 68]], text: "Every shadow tells a tale" },
  { chords: [["F", 0], ["C", 34], ["G", 60]], text: "Of the ones who never fail" },
  { section: "Chorus" },
  { chords: [["F", 0], ["G", 40], ["Am", 72]], text: "Every step is leading somewhere" },
  { chords: [["F", 0], ["C", 38], ["G", 70]], text: "Carry on, there's magic in the air" },
  { chords: [["C", 0], ["G", 40], ["Am", 66]], text: "Hold the line and don't look back" },
  { chords: [["F", 0], ["C", 36], ["G", 60]], text: "Find your way and don't look back" },
  { section: "Verse 2" },
  { chords: [["Am", 0], ["G", 52]], text: "Morning breaks the falling dark" },
  { chords: [["Am", 0], ["F", 36], ["G", 64]], text: "Lighting up a brand new spark" },
  { chords: [["C", 0], ["G", 44], ["Am", 70]], text: "Voices rising, soft and clear" },
  { chords: [["F", 0], ["C", 36], ["G", 62]], text: "Calling all the world to hear" },
];

function SheetLines() {
  return (
    <div className="px-6 sm:px-10 pb-8 text-left">
      {SHEET.map((line, i) =>
        line.section ? (
          <div key={i} className="pt-5 pb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">{line.section}</span>
            <div className="mt-0.5 h-px bg-cyan-300/25" />
          </div>
        ) : (
          <div key={i} className="relative pt-4">
            <div className="relative h-3">
              {line.chords!.map(([c, left]) => (
                <span key={c + left} className="absolute top-0 text-[10px] sm:text-xs font-bold font-mono text-pink-400" style={{ left: `${left}%` }}>
                  {c}
                </span>
              ))}
            </div>
            <p className="text-[11px] sm:text-sm text-zinc-100/90 font-mono whitespace-nowrap">{line.text}</p>
          </div>
        )
      )}
    </div>
  );
}

export default function HeroDemo() {
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(150deg, #14102e 0%, #1d1642 55%, #2a1454 100%)" }}>
      {/* Browser chrome */}
      <div className="relative z-10 flex items-center gap-1.5 px-4 py-2.5 bg-black/40 backdrop-blur-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <span className="flex-1 mx-3 text-center text-[10px] text-white/30 font-mono truncate tracking-wide">chordsheetmaker.ai — play mode</span>
      </div>

      {/* Auto-scrolling sheet (content duplicated for a seamless loop) */}
      <div className="relative h-[260px] sm:h-[340px] overflow-hidden" aria-hidden>
        <div className="hero-scroll">
          <div className="pt-6 text-center">
            <p className="text-base sm:text-lg font-extrabold text-yellow-300 font-mono">Midnight Highway</p>
            <p className="text-[10px] sm:text-xs text-white/40 font-mono">The Wanderers</p>
          </div>
          <SheetLines />
          <div className="pt-6 text-center">
            <p className="text-base sm:text-lg font-extrabold text-yellow-300 font-mono">Midnight Highway</p>
            <p className="text-[10px] sm:text-xs text-white/40 font-mono">The Wanderers</p>
          </div>
          <SheetLines />
        </div>
        {/* Fades top/bottom so the loop reads as endless */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-10" style={{ background: "linear-gradient(to bottom, #171233 0%, transparent 100%)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14" style={{ background: "linear-gradient(to top, #241448 0%, transparent 100%)" }} />
      </div>

      {/* Play-mode control bar */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 py-3 bg-black/40 backdrop-blur-sm">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-900/50">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <rect x="5" y="4" width="3" height="12" rx="1" /><rect x="12" y="4" width="3" height="12" rx="1" />
          </svg>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Slow</span>
          <span className="relative w-24 h-1 rounded-full bg-white/15">
            <span className="absolute left-[22%] -top-1 w-3 h-3 rounded-full bg-indigo-400 shadow" />
          </span>
          <span className="text-[10px] text-white/40">Fast</span>
        </div>
        <span className="text-[10px] text-white/40 font-mono hidden sm:inline">auto-scroll</span>
      </div>
    </div>
  );
}
