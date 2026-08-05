"use client";

import { useState, useEffect } from "react";

const ROOTS = ["C", "D", "E", "F", "G", "A", "B"];

const ACCIDENTALS = [
  { label: "♯", value: "#" },
  { label: "♭", value: "b" },
];

// Ordered roughly by how often each quality appears in popular music
// (most common first). 12 entries = 3 full rows of 4.
const QUALITIES = [
  { label: "maj",   value: ""     }, // major triad
  { label: "m",     value: "m"    }, // minor triad
  { label: "7",     value: "7"    }, // dominant 7th
  { label: "m7",    value: "m7"   }, // minor 7th
  { label: "maj7",  value: "maj7" }, // major 7th
  { label: "sus4",  value: "sus4" }, // suspended 4th
  { label: "sus2",  value: "sus2" }, // suspended 2nd
  { label: "add9",  value: "add9" }, // added 9th
  { label: "6",     value: "6"    }, // major 6th
  { label: "9",     value: "9"    }, // dominant 9th
  { label: "dim",   value: "dim"  }, // diminished
  { label: "dim7",  value: "dim7" }, // diminished 7th
];

// Extended / altered jazz qualities, hidden behind the "More" toggle.
// 12 entries = 3 full rows of 4.
const ADVANCED_QUALITIES = [
  { label: "maj9",  value: "maj9" }, // major 9th
  { label: "m9",    value: "m9"   }, // minor 9th
  { label: "13",    value: "13"   }, // dominant 13th
  { label: "11",    value: "11"   }, // dominant 11th
  { label: "m7♭5",  value: "m7b5" }, // half-diminished
  { label: "aug",   value: "aug"  }, // augmented
  { label: "7♭9",   value: "7b9"  }, // dominant flat 9
  { label: "7♯9",   value: "7#9"  }, // dominant sharp 9 ("Hendrix")
  { label: "m11",   value: "m11"  }, // minor 11th
  { label: "m13",   value: "m13"  }, // minor 13th
  { label: "6/9",   value: "6/9"  }, // six-nine
  { label: "7alt",  value: "7alt" }, // altered dominant
];

interface Props {
  activeChord: string | null;
  onSelectChord: (chord: string | null) => void;
  onConfirmChord?: () => void;
  songChords?: string[];
  asideClassName?: string;
}

export default function ChordPalette({ activeChord, onSelectChord, onConfirmChord, songChords = [], asideClassName }: Props) {
  const [root, setRoot] = useState<string | null>(null);
  const [accidental, setAccidental] = useState("");
  const [quality, setQuality] = useState("");
  const [customChord, setCustomChord] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Keep the advanced row visible whenever an advanced quality is selected.
  const qualityIsAdvanced = ADVANCED_QUALITIES.some((q) => q.value === quality);

  // Remember the user's "More chords" preference across sessions.
  const ADV_KEY = "chordPalette:showAdvanced";
  useEffect(() => {
    try {
      if (localStorage.getItem(ADV_KEY) === "1") setShowAdvanced(true);
    } catch { /* ignore */ }
  }, []);
  const toggleAdvanced = () => {
    const next = !(showAdvanced || qualityIsAdvanced);
    setShowAdvanced(next);
    try { localStorage.setItem(ADV_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!activeChord) {
      setRoot(null);
      setAccidental("");
      setQuality("");
    }
  }, [activeChord]);

  // Load Noto Music for musical symbols
  useEffect(() => {
    const id = "noto-music-font";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Noto+Music&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const handleRootClick = (note: string) => {
    const newRoot = root === note ? null : note;
    setRoot(newRoot);
    onSelectChord(newRoot ? `${newRoot}${accidental}${quality}` : null);
  };

  const handleAccidentalClick = (value: string) => {
    const newAcc = accidental === value ? "" : value;
    setAccidental(newAcc);
    if (root) onSelectChord(`${root}${newAcc}${quality}`);
  };

  const handleQualityClick = (value: string) => {
    const newQ = quality === value ? "" : value;
    setQuality(newQ);
    if (root) onSelectChord(`${root}${accidental}${newQ}`);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customChord.trim()) {
      onSelectChord(customChord.trim());
      setRoot(null);
      setAccidental("");
      setQuality("");
      setCustomChord("");
    }
  };

  const btnBase = "px-2.5 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-150";
  const btnActive = "bg-gradient-to-br from-indigo-500 to-violet-600 border-transparent text-white shadow-md shadow-indigo-500/30";
  const btnIdle = "bg-white border-zinc-200 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600 hover:-translate-y-[1px] hover:shadow-sm";
  const heading = "text-[11px] font-semibold uppercase tracking-widest text-zinc-400";

  return (
    <aside className={asideClassName ?? "w-80 shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col overflow-hidden"}>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">

        {/* ── Active chord display ── */}
        {activeChord ? (
          <div
            className="relative overflow-hidden flex items-center justify-between rounded-2xl px-4 py-3 shadow-lg shadow-indigo-500/25"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 65%, #8b5cf6 100%)" }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(ellipse 60% 80% at 20% 0%, rgba(255,255,255,0.18) 0%, transparent 60%)",
            }} />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-widest text-indigo-200 mb-0.5">Selected chord</p>
              <p className="text-3xl font-extrabold text-white leading-none drop-shadow-sm">{activeChord}</p>
            </div>
            <div className="relative text-right flex flex-col items-end gap-1.5">
              <p className="text-xs text-indigo-100">
                <span className="sm:hidden">Tap</span>
                <span className="hidden sm:inline">Click</span>{" "}
                a lyric line to place
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onSelectChord(null)}
                  className="text-xs text-indigo-100 hover:text-white transition-colors border border-white/30 hover:border-white/70 hover:bg-white/10 rounded-lg px-2.5 py-1"
                >Clear</button>
                {onConfirmChord && (
                  <button
                    onClick={onConfirmChord}
                    className="sm:hidden text-xs bg-white text-indigo-600 font-semibold rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors shadow-sm"
                  >Place →</button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-3.5 py-2.5">
            <span className="flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 text-sm">♪</span>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Pick a root note, then{" "}
              <span className="sm:hidden">tap</span>
              <span className="hidden sm:inline">click</span>{" "}
              a lyric line to place it.
            </p>
          </div>
        )}

        {/* ── Chords in this song ── */}
        {songChords.length > 0 && (
          <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm px-3.5 py-3">
            <p className={`${heading} mb-2`}>In this song</p>
            <div className="flex gap-1.5 flex-wrap">
              {songChords.map((chord) => (
                <button key={chord} onClick={() => { onSelectChord(chord); onConfirmChord?.(); }}
                  className={`${btnBase} !rounded-full px-3 ${activeChord === chord ? btnActive : btnIdle}`}
                >{chord}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chord builder card ── */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">

          {/* Root + accidental — one visual step */}
          <div className="px-3.5 py-3 border-b border-zinc-100">
            <p className={`${heading} mb-2`}>Root</p>
            <div className="grid grid-cols-7 gap-1">
              {ROOTS.map((note) => (
                <button key={note} onClick={() => handleRootClick(note)}
                  className={`${btnBase} !px-0 text-center ${root === note ? btnActive : btnIdle}`}
                >{note}</button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {ACCIDENTALS.map((a) => (
                <button key={a.label} onClick={() => handleAccidentalClick(a.value)}
                  disabled={!root}
                  style={{ fontFamily: "'Noto Music', sans-serif", fontSize: 17 }}
                  className={`${btnBase} w-12 text-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${
                    accidental === a.value && root ? btnActive : btnIdle
                  }`}
                >{a.label}</button>
              ))}
              <span className="text-[11px] text-zinc-300 ml-1">sharp / flat</span>
            </div>
          </div>

          {/* Quality */}
          <div className="px-3.5 py-3">
            <p className={`${heading} mb-2`}>Quality</p>
            <div className="grid grid-cols-4 gap-1">
              {QUALITIES.map((q) => (
                <button key={q.label} onClick={() => handleQualityClick(q.value)}
                  disabled={!root}
                  className={`${btnBase} !px-0 text-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${
                    quality === q.value && root ? btnActive : btnIdle
                  }`}
                >{q.label}</button>
              ))}
            </div>

            {/* Advanced jazz qualities */}
            {(showAdvanced || qualityIsAdvanced) && (
              <div className="grid grid-cols-4 gap-1 mt-1">
                {ADVANCED_QUALITIES.map((q) => (
                  <button key={q.label} onClick={() => handleQualityClick(q.value)}
                    disabled={!root}
                    className={`${btnBase} !px-0 text-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${
                      quality === q.value && root ? btnActive : btnIdle
                    }`}
                  >{q.label}</button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={toggleAdvanced}
              className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors py-1.5"
            >
              {showAdvanced || qualityIsAdvanced ? "Fewer chords" : "More chords"}
              <svg className={`w-3 h-3 transition-transform ${showAdvanced || qualityIsAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Custom chord card ── */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm px-3.5 py-3">
          <p className={`${heading} mb-2`}>Custom <span className="text-zinc-300 normal-case tracking-normal font-normal">(e.g. D/F#)</span></p>
          <form onSubmit={handleCustomSubmit} className="flex gap-1.5">
            <input
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              placeholder="D/F#, Badd11…"
              className="flex-1 min-w-0 text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-zinc-50 transition-shadow"
            />
            <button type="submit"
              className="shrink-0 text-xs bg-gradient-to-br from-indigo-500 to-violet-600 text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-semibold shadow-sm shadow-indigo-500/30"
            >Use</button>
          </form>
        </div>

        {/* ── Tip ── */}
        <p className="text-[11px] text-zinc-400 px-1">💡 Drag a placed chord to move it · double-click to rename</p>

      </div>
    </aside>
  );
}
