"use client";

import { useState, useEffect, useRef } from "react";
import type { SongLine } from "@/types/song";

interface Props {
  lines: SongLine[];
  onReplace: (find: string, replace: string) => void;
  onClose: () => void;
}

export default function FindReplaceModal({ lines, onReplace, onClose }: Props) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [done, setDone] = useState(false);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const matchCount = find.trim()
    ? lines.reduce((sum, line) => {
        if (line.type !== "lyric") return sum;
        return sum + line.chords.filter((c) => c.chord === find.trim()).length;
      }, 0)
    : 0;

  const handleReplace = () => {
    if (!find.trim() || matchCount === 0) return;
    onReplace(find.trim(), replace.trim());
    setDone(true);
    setTimeout(onClose, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Find &amp; replace chord</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none px-1">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Find chord</label>
            <input
              ref={findRef}
              value={find}
              onChange={(e) => { setFind(e.target.value); setDone(false); }}
              placeholder="e.g. Am"
              spellCheck={false}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400"
              onKeyDown={(e) => { if (e.key === "Enter") handleReplace(); }}
            />
            {find.trim() && (
              <p className={`text-xs mt-0.5 ${matchCount > 0 ? "text-indigo-600" : "text-zinc-400"}`}>
                {matchCount > 0
                  ? `${matchCount} chord${matchCount !== 1 ? "s" : ""} found`
                  : "No chords match"}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Replace with</label>
            <input
              value={replace}
              onChange={(e) => { setReplace(e.target.value); setDone(false); }}
              placeholder="e.g. A"
              spellCheck={false}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400"
              onKeyDown={(e) => { if (e.key === "Enter") handleReplace(); }}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReplace}
            disabled={matchCount === 0 || done}
            className="text-sm bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            {done ? "✓ Replaced!" : `Replace all${matchCount > 0 ? ` (${matchCount})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
