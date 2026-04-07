"use client";

import { useState, useEffect } from "react";

const ROOTS = ["C", "D", "E", "F", "G", "A", "B"];

const ACCIDENTALS = [
  { label: "♮", value: "" },
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
  { label: "aug",   value: "aug"  },
  { label: "6",     value: "6"    },
  { label: "9",     value: "9"    },
];

interface Props {
  activeChord: string | null;
  onSelectChord: (chord: string | null) => void;
  asideClassName?: string;
}

export default function ChordPalette({ activeChord, onSelectChord, asideClassName }: Props) {
  const [root, setRoot] = useState<string | null>(null);
  const [accidental, setAccidental] = useState("");
  const [quality, setQuality] = useState("");
  const [customChord, setCustomChord] = useState("");

  // If the active chord is cleared externally, reset the builder
  useEffect(() => {
    if (!activeChord) {
      setRoot(null);
      setAccidental("");
      setQuality("");
    }
  }, [activeChord]);

  const builtChord = root ? `${root}${accidental}${quality}` : null;

  const handleRootClick = (note: string) => {
    const newRoot = root === note ? null : note;
    setRoot(newRoot);
    if (newRoot) {
      onSelectChord(`${newRoot}${accidental}${quality}`);
    } else {
      onSelectChord(null);
    }
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
  const btnIdle = "bg-white border-zinc-200 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600";

  return (
    <aside className={asideClassName ?? "w-72 shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col overflow-hidden"}>
      <div className="px-4 py-3 border-b border-zinc-200">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Chord Palette</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Active chord status */}
        {activeChord ? (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            <span className="text-sm text-indigo-700 font-semibold">{activeChord}</span>
            <button
              onClick={() => onSelectChord(null)}
              className="text-indigo-400 hover:text-indigo-700 text-xs"
              title="Clear chord"
            >✕</button>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 leading-relaxed">
            Build a chord below, then click above a lyric line to place it.
          </p>
        )}

        {/* Step 1 — Root note */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-1.5">Root</p>
          <div className="flex gap-1.5 flex-wrap">
            {ROOTS.map((note) => (
              <button
                key={note}
                onClick={() => handleRootClick(note)}
                className={`${btnBase} ${root === note ? btnActive : btnIdle}`}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Accidental */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-1.5">Accidental</p>
          <div className="flex gap-1.5">
            {ACCIDENTALS.map((a) => (
              <button
                key={a.label}
                onClick={() => handleAccidentalClick(a.value)}
                disabled={!root}
                className={`${btnBase} disabled:opacity-30 disabled:cursor-not-allowed ${
                  accidental === a.value && root ? btnActive : btnIdle
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 — Quality */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-1.5">Quality</p>
          <div className="flex gap-1.5 flex-wrap">
            {QUALITIES.map((q) => (
              <button
                key={q.label}
                onClick={() => handleQualityClick(q.value)}
                disabled={!root}
                className={`${btnBase} disabled:opacity-30 disabled:cursor-not-allowed ${
                  quality === q.value && root ? btnActive : btnIdle
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-200" />

        {/* Custom chord (for slash chords etc.) */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-1.5">Custom <span className="text-zinc-300 font-normal">(e.g. D/F#)</span></p>
          <form onSubmit={handleCustomSubmit} className="flex gap-1.5">
            <input
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              placeholder="D/F#, Badd11…"
              className="flex-1 min-w-0 text-sm border border-zinc-200 rounded px-2.5 py-1.5 outline-none focus:border-indigo-400 bg-white"
            />
            <button
              type="submit"
              className="shrink-0 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors font-medium"
            >
              Use
            </button>
          </form>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-zinc-200">
        <p className="text-xs text-zinc-400">
          💡 Drag a chord left/right to reposition it. Double-click to rename.
        </p>
      </div>
    </aside>
  );
}
