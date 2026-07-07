"use client";

import Link from "next/link";

// Live examples — each card opens a real public share where visitors can hit
// play and feel the auto-scroll. Previews are lightweight CSS impressions of
// each sheet's actual styling (no screenshot assets to keep in sync).

const EXAMPLES = [
  {
    href: "/share/cmr9haxoo000004ks4mcgmddi",
    title: "Dansa i Neon",
    artist: "Lena Philipsson",
    vibe: "Neon city — dark stage look",
    bg: "linear-gradient(150deg, #14102e 0%, #241b4d 45%, #3b1060 100%)",
    accents: ["#22d3ee", "#f472b6"],
    titleColor: "#e8f95c",
    lyric: "rgba(255,255,255,0.75)",
  },
  {
    href: "/share/cmr9hfayp000204ksybupx8cp",
    title: "Wildflowers",
    artist: "Tom Petty",
    vibe: "Watercolor sail — light & airy",
    bg: "linear-gradient(150deg, #fdf6ec 0%, #f6e9d8 55%, #eadfce 100%)",
    accents: ["#2f7d4f", "#2f7d4f"],
    titleColor: "#8a4b2d",
    lyric: "rgba(60,45,30,0.75)",
  },
  {
    href: "/share/cmr9hft4e000104jvpw9wc11v",
    title: "Nothing's Gonna Change My Love For You",
    artist: "George Benson",
    vibe: "Lighthouse mist — jazz chords",
    bg: "linear-gradient(150deg, #f3f2f0 0%, #e7e4e0 55%, #d9d4cf 100%)",
    accents: ["#0e7490", "#0e7490"],
    titleColor: "#8b1d2c",
    lyric: "rgba(50,45,40,0.75)",
  },
];

/** Impression of a chord sheet: a few chord+lyric line pairs. */
function MiniSheet({ accents, lyric }: { accents: string[]; lyric: string }) {
  const rows = [
    [16, 52, 78],
    [22, 60],
    [14, 44, 70],
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((chords, r) => (
        <div key={r}>
          <div className="relative h-2.5 mb-1">
            {chords.map((left, i) => (
              <span
                key={i}
                className="absolute top-0 text-[8px] font-bold font-mono leading-none"
                style={{ left: `${left}%`, color: accents[i % accents.length] }}
              >
                {["Am", "F", "C", "G", "Dm"][(r + i) % 5]}
              </span>
            ))}
          </div>
          <div className="h-1.5 rounded-full" style={{ background: lyric, opacity: 0.55, width: `${88 - r * 14}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function ExamplesSection() {
  return (
    <section className="relative px-4 sm:px-6 py-14 sm:py-24 overflow-hidden" style={{ background: "linear-gradient(180deg, #f0efff 0%, #eae8ff 100%)" }}>
      <div className="relative max-w-5xl mx-auto">
        <span className="block text-center text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Examples</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-zinc-800 mb-3 tracking-tight">Play a real chord sheet</h2>
        <p className="text-center text-zinc-500 mb-14 max-w-xl mx-auto text-lg leading-relaxed">
          Real sheets, AI backgrounds and fonts — charts you&apos;ll actually enjoy looking at.
          Open one, press <strong className="text-zinc-700">play</strong>, and watch it scroll hands-free.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {EXAMPLES.map((ex) => (
            <a
              key={ex.href}
              href={ex.href}
              target="_blank"
              rel="noopener"
              className="group relative transition-transform duration-300 hover:-translate-y-2 text-left"
            >
              {/* Soft shadow halo */}
              <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl"
                style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />

              <div className="relative rounded-2xl overflow-hidden border border-indigo-100 shadow-xl shadow-indigo-200/50 transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-indigo-300/50 bg-white">
                {/* Browser chrome bar */}
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  <span className="flex-1 mx-3 text-center text-[10px] text-white/25 font-mono truncate tracking-wide">chordsheetmaker.ai</span>
                </div>

                {/* Styled mini preview */}
                <div className="relative aspect-[16/11] overflow-hidden px-5 pt-4" style={{ background: ex.bg }}>
                  <p className="text-center font-extrabold text-sm truncate" style={{ color: ex.titleColor }}>{ex.title}</p>
                  <p className="text-center text-[9px] italic mb-3" style={{ color: ex.lyric }}>{ex.artist}</p>
                  <MiniSheet accents={ex.accents} lyric={ex.lyric} />
                  {/* Play affordance */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600/90 text-white shadow-lg shadow-indigo-900/40 transition-transform duration-300 group-hover:scale-110">
                      <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 4.2a1 1 0 0 0-1.3.95v9.7a1 1 0 0 0 1.3.95l9-4.85a1 1 0 0 0 0-1.9L6.3 4.2z" /></svg>
                    </span>
                  </div>
                </div>

                {/* Caption */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-800 truncate">{ex.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{ex.vibe}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">Open &amp; play →</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/songs" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-full text-sm font-semibold transition-colors shadow-md shadow-indigo-200">
            Create yours for free →
          </Link>
        </div>
      </div>
    </section>
  );
}
