"use client";

import { useState } from "react";

const CHORD_GROUPS = [
  { label: "Major",   chords: ["C", "D", "E", "F", "G", "A", "B"] },
  { label: "Minor",   chords: ["Am", "Bm", "Cm", "Dm", "Em", "Fm", "Gm"] },
  { label: "7th",     chords: ["G7", "C7", "D7", "E7", "A7", "B7", "F7"] },
  { label: "Sus / Add", chords: ["Dsus2", "Dsus4", "Asus2", "Asus4", "Cadd9", "Gadd9"] },
  { label: "Extended", chords: ["Em7", "Am7", "Fmaj7", "Cmaj7", "Dmaj7", "Bm7"] },
  { label: "♯ / ♭",   chords: ["F#m", "C#m", "G#m", "Bb", "Eb", "Ab", "Db"] },
];

interface Props {
  activeChord: string | null;
  onSelectChord: (chord: string | null) => void;
  asideClassName?: string;
}

export default function ChordPalette({ activeChord, onSelectChord, asideClassName }: Props) {
  const [customChord, setCustomChord] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customChord.trim()) {
      onSelectChord(customChord.trim());
      setCustomChord("");
    }
  };

  return (
    <aside className={asideClassName ?? "w-52 shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col overflow-hidden"}>
      <div className="px-4 py-3 border-b border-zinc-200">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Chord Palette
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Active chord banner */}
        {activeChord && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            <span className="text-xs text-indigo-700 font-medium">
              Placing <strong>{activeChord}</strong>
            </span>
            <button
              onClick={() => onSelectChord(null)}
              className="text-indigo-400 hover:text-indigo-700 text-xs leading-none"
            >
              ✕
            </button>
          </div>
        )}

        <p className="text-xs text-zinc-400 leading-relaxed">
          {activeChord
            ? "Click in the chord area above any lyric line to place it."
            : "Select a chord then click above a lyric line to place it."}
        </p>

        {/* Chord groups */}
        {CHORD_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-medium text-zinc-400 mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1">
              {group.chords.map((chord) => (
                <button
                  key={chord}
                  onClick={() => onSelectChord(activeChord === chord ? null : chord)}
                  className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                    activeChord === chord
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-zinc-200 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Custom chord */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-1.5">Custom</p>
          <form onSubmit={handleCustomSubmit} className="flex gap-1">
            <input
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              placeholder="e.g. D/F#"
              className="flex-1 text-xs border border-zinc-200 rounded px-2 py-1 outline-none focus:border-indigo-400 bg-white"
            />
            <button
              type="submit"
              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors"
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
