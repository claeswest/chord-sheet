"use client";

import { useState, useEffect } from "react";

const ROOTS = ["C", "D", "E", "F", "G", "A", "B"];

const ACCIDENTALS = [
  { label: "♯", value: "#", name: "Sharp" },
  { label: "♭", value: "b", name: "Flat" },
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

/** What the builder has picked so far. There is a chord once there is a root. */
interface Parts {
  root: string | null;
  accidental: string;
  quality: string;
  /** The note under a slash chord: the F♯ of D/F♯. */
  bass: string | null;
  bassAccidental: string;
}

const NOTHING_PICKED: Parts = { root: null, accidental: "", quality: "", bass: null, bassAccidental: "" };

function chordName(p: Parts): string | null {
  if (!p.root) return null;
  const bass = p.bass ? `/${p.bass}${p.bassAccidental}` : "";
  return `${p.root}${p.accidental}${p.quality}${bass}`;
}

const btnBase = "px-2.5 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-150";
const btnActive = "bg-chord border-transparent text-white";
const btnIdle = "bg-white border-zinc-200 text-zinc-700 hover:border-ink/40 hover:text-ink";
// Not usable yet, but still readable: these wait for an earlier step, and a
// faded-out grid looked broken rather than waiting.
const btnWaiting = "bg-stone-100 border-transparent text-stone-500 cursor-not-allowed";
const heading = "text-[11px] font-semibold uppercase tracking-widest text-stone-500";
const aside = "text-[11px] font-normal normal-case tracking-normal text-stone-500";

/** A button that stays down while its choice is in the chord. */
function btn(pressed: boolean, waiting = false): string {
  return `${btnBase} ${waiting ? btnWaiting : pressed ? btnActive : btnIdle}`;
}

/**
 * The seven notes and, under them, sharp and flat. Used for the root and again
 * for the bass, whose buttons say so in their names: otherwise there would be
 * two buttons called "G".
 */
function NotePicker({ note, accidental, onNote, onAccidental, waiting = false, bass = false }: {
  note: string | null;
  accidental: string;
  onNote: (note: string) => void;
  onAccidental: (value: string) => void;
  waiting?: boolean;
  bass?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {ROOTS.map((n) => (
          <button key={n} type="button" onClick={() => onNote(n)}
            disabled={waiting}
            aria-pressed={note === n}
            aria-label={bass ? `Bass ${n}` : undefined}
            className={`${btn(note === n, waiting)} !px-0 text-center`}
          >{n}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        {ACCIDENTALS.map((a) => {
          const pressed = !!note && accidental === a.value;
          return (
            <button key={a.value} type="button" onClick={() => onAccidental(a.value)}
              disabled={!note}
              aria-pressed={pressed}
              aria-label={bass ? `Bass ${a.name.toLowerCase()}` : a.name}
              style={{ fontFamily: "'Noto Music', sans-serif", fontSize: 17 }}
              className={`${btn(pressed, !note)} w-12 text-center`}
            >{a.label}</button>
          );
        })}
        <span className="text-[11px] text-stone-500 ml-1">sharp / flat</span>
      </div>
    </>
  );
}

interface Props {
  activeChord: string | null;
  onSelectChord: (chord: string | null) => void;
  onConfirmChord?: () => void;
  songChords?: string[];
  asideClassName?: string;
}

export default function ChordPalette({ activeChord, onSelectChord, onConfirmChord, songChords = [], asideClassName }: Props) {
  const [parts, setParts] = useState<Parts>(NOTHING_PICKED);
  const [customChord, setCustomChord] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { root, accidental, quality, bass, bassAccidental } = parts;

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
    if (!activeChord) setParts(NOTHING_PICKED);
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

  /** Changes one part of the chord and selects what that makes. Picking a part twice takes it away. */
  const pick = (change: Partial<Parts>) => {
    const next = { ...parts, ...change };
    setParts(next);
    onSelectChord(chordName(next));
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customChord.trim()) {
      onSelectChord(customChord.trim());
      setParts(NOTHING_PICKED);
      setCustomChord("");
    }
  };

  const qualityButton = (q: { label: string; value: string }) => {
    const pressed = !!root && quality === q.value;
    return (
      <button key={q.label} type="button" onClick={() => pick({ quality: quality === q.value ? "" : q.value })}
        disabled={!root}
        aria-pressed={pressed}
        className={`${btn(pressed, !root)} !px-0 text-center`}
      >{q.label}</button>
    );
  };

  return (
    <aside className={asideClassName ?? "w-80 shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col overflow-hidden"}>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">

        {/* ── Active chord display ── */}
        {activeChord ? (
          <div
            className="relative overflow-hidden flex items-center justify-between rounded-xl px-4 py-3 bg-chord"
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
          <div className="flex items-center gap-2.5 rounded-xl border border-rule bg-white px-3.5 py-2.5">
            <span className="flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-paper-deep text-chord text-sm">♪</span>
            <div className="text-xs text-zinc-600 leading-relaxed">
              <p>
                Pick a root note, then{" "}
                <span className="sm:hidden">tap</span>
                <span className="hidden sm:inline">click</span>{" "}
                a lyric line to place it.
              </p>
              {/* Only once there is a chord to move: before that it is noise. */}
              {songChords.length > 0 && (
                <p className="mt-1 text-stone-500">Drag a placed chord to move it, double-click to rename it.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Chords in this song ── */}
        {songChords.length > 0 && (
          <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm px-3.5 py-3">
            <p className={`${heading} mb-2`}>In this song</p>
            <div className="flex gap-1.5 flex-wrap">
              {songChords.map((chord) => (
                <button key={chord} type="button" onClick={() => { onSelectChord(chord); onConfirmChord?.(); }}
                  aria-pressed={activeChord === chord}
                  className={`${btn(activeChord === chord)} !rounded-full px-3`}
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
            <NotePicker
              note={root}
              accidental={accidental}
              onNote={(n) => pick({ root: root === n ? null : n })}
              onAccidental={(v) => pick({ accidental: accidental === v ? "" : v })}
            />
          </div>

          {/* Quality */}
          <div className="px-3.5 py-3 border-b border-zinc-100">
            <p className={`${heading} mb-2 flex items-baseline justify-between`}>
              Quality
              {!root && <span className={aside}>Pick a root first</span>}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {QUALITIES.map(qualityButton)}
            </div>

            {/* Advanced jazz qualities */}
            {(showAdvanced || qualityIsAdvanced) && (
              <div className="grid grid-cols-4 gap-1 mt-1">
                {ADVANCED_QUALITIES.map(qualityButton)}
              </div>
            )}

            <button
              type="button"
              onClick={toggleAdvanced}
              className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-medium text-stone-600 hover:text-ink hover:bg-ink/5 rounded-lg transition-colors py-1.5"
            >
              {showAdvanced || qualityIsAdvanced ? "Fewer chords" : "More chords"}
              <svg className={`w-3 h-3 transition-transform ${showAdvanced || qualityIsAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* Bass: the note after the slash */}
          <div className="px-3.5 py-3">
            <p className={`${heading} mb-2 flex items-baseline justify-between`}>
              Bass note
              <span className={aside}>optional, as in D/F♯</span>
            </p>
            <NotePicker
              bass
              waiting={!root}
              note={bass}
              accidental={bassAccidental}
              onNote={(n) => pick(bass === n ? { bass: null, bassAccidental: "" } : { bass: n })}
              onAccidental={(v) => pick({ bassAccidental: bassAccidental === v ? "" : v })}
            />
          </div>
        </div>

        {/* ── Custom chord card ── */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm px-3.5 py-3">
          <p className={`${heading} mb-2`}>Custom</p>
          <form onSubmit={handleCustomSubmit} className="flex gap-1.5">
            <input
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              aria-label="Custom chord"
              placeholder="Badd11, G7sus4…"
              className="flex-1 min-w-0 text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 bg-white transition-shadow"
            />
            {/* Quiet until there is something to use: it is the least used control here. */}
            <button type="submit"
              disabled={!customChord.trim()}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-colors ${
                customChord.trim() ? "bg-ink border-transparent text-paper hover:bg-stone-700" : btnWaiting
              }`}
            >Use</button>
          </form>
        </div>

      </div>
    </aside>
  );
}
