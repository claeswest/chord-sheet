"use client";

import { useState, useEffect } from "react";

const ROOTS = ["C", "D", "E", "F", "G", "A", "B"];

const ACCIDENTALS = [
  { label: "♯", value: "#" },
  { label: "♭", value: "b" },
];

const QUALITIES = [
  { label: "maj",   value: ""     },
  { label: "m",     value: "m"    },
  { label: "7",     value: "7"    },
  { label: "m7",    value: "m7"   },
  { label: "maj7",  value: "maj7" },
  { label: "sus2",  value: "sus2" },
  { label: "sus4",  value: "sus4" },
  { label: "add9",  value: "add9" },
  { label: "dim",   value: "dim"  },
  { label: "dim7",  value: "dim7" },
];

interface Props {
  activeChord: string | null;
  onSelectChord: (chord: string | null) => void;
  songChords?: string[];
  asideClassName?: string;
}

export default function ChordPalette({ activeChord, onSelectChord, songChords = [], asideClassName }: Props) {
  const [root, setRoot] = useState<string | null>(null);
  const [accidental, setAccidental] = useState("");
  const [quality, setQuality] = useState("");
  const [customChord, setCustomChord] = useState("");

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

  const btnBase = "px-2.5 py-1.5 rounded border text-sm font-medium transition-colors";
  const btnActive = "bg-indigo-600 border-indigo-600 text-white";
  const btnIdle = "bg-white border-zinc-200 text-zinc-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600";

  return (
    <aside className={asideClassName ?? "w-80 shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col overflow-hidden"}>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

        {/* ── Active chord display ── */}
        {activeChord ? (
          <div className="flex items-center justify-between bg-indigo-600 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-indigo-200 mb-0.5">Selected chord</p>
              <p className="text-2xl font-bold text-white leading-none">{activeChord}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-indigo-200 mb-1.5">Click a lyric line to place</p>
              <button
                onClick={() => onSelectChord(null)}
                className="text-xs text-indigo-200 hover:text-white transition-colors border border-indigo-400 hover:border-indigo-200 rounded-lg px-2 py-1"
              >Clear</button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-center">
            <p className="text-xs text-zinc-400">Pick a root note, then click a lyric line to place it.</p>
          </div>
        )}

        {/* ── Chords in this song ── */}
        {songChords.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden px-3 py-2.5">
            <p className="text-xs font-medium text-zinc-500 mb-2">In this song</p>
            <div className="flex gap-1 flex-wrap">
              {songChords.map((chord) => (
                <button key={chord} onClick={() => onSelectChord(chord)}
                  className={`${btnBase} ${activeChord === chord ? btnActive : btnIdle}`}
                >{chord}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chord builder card ── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

          {/* Root */}
          <div className="px-3 py-2.5 border-b border-zinc-100">
            <p className="text-xs font-medium text-zinc-500 mb-2">Root</p>
            <div className="grid grid-cols-7 gap-1">
              {ROOTS.map((note) => (
                <button key={note} onClick={() => handleRootClick(note)}
                  className={`${btnBase} text-center ${root === note ? btnActive : btnIdle}`}
                >{note}</button>
              ))}
            </div>
          </div>

          {/* Accidental */}
          <div className="px-3 py-2.5 border-b border-zinc-100">
            <p className="text-xs font-medium text-zinc-500 mb-2">Accidental</p>
            <div className="flex gap-1.5">
              {ACCIDENTALS.map((a) => (
                <button key={a.label} onClick={() => handleAccidentalClick(a.value)}
                  disabled={!root}
                  style={{ fontFamily: "'Noto Music', sans-serif", fontSize: 18 }}
                  className={`${btnBase} text-center disabled:opacity-30 disabled:cursor-not-allowed ${
                    accidental === a.value && root ? btnActive : btnIdle
                  }`}
                >{a.label}</button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="px-3 py-2.5">
            <p className="text-xs font-medium text-zinc-500 mb-2">Quality</p>
            <div className="grid grid-cols-4 gap-1">
              {QUALITIES.map((q) => (
                <button key={q.label} onClick={() => handleQualityClick(q.value)}
                  disabled={!root}
                  className={`${btnBase} text-center disabled:opacity-30 disabled:cursor-not-allowed ${
                    quality === q.value && root ? btnActive : btnIdle
                  }`}
                >{q.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Custom chord card ── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden px-3 py-2.5">
          <p className="text-xs font-medium text-zinc-500 mb-2">Custom <span className="text-zinc-300 font-normal">(e.g. D/F#)</span></p>
          <form onSubmit={handleCustomSubmit} className="flex gap-1.5">
            <input
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              placeholder="D/F#, Badd11…"
              className="flex-1 min-w-0 text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 bg-zinc-50"
            />
            <button type="submit"
              className="shrink-0 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >Use</button>
          </form>
        </div>

        {/* ── Tip ── */}
        <p className="text-xs text-zinc-400">💡 Drag to reposition · Double-click to rename</p>

      </div>
    </aside>
  );
}
