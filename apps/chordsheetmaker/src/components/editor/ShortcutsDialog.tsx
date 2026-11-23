"use client";

import { useEffect } from "react";

// The keyboard cheatsheet, opened with "?" or the keyboard button. One list
// for the editor and for play mode, so the two cannot drift apart: each shows
// its own keys first and leaves out what does nothing where it is.

type Row = readonly [keys: string, what: string];

const EDITING: Row[] = [
  ["Ctrl+Z", "Undo"],
  ["Ctrl+Y / Ctrl+Shift+Z", "Redo"],
  ["Enter", "New line below"],
  ["Esc", "Cancel chord placement"],
];

const PLAYING: Row[] = [
  ["Space", "Play / pause auto-scroll"],
  ["← / →", "Scroll slower / faster"],
  ["+ / −", "Bigger / smaller text"],
  ["C", "Hide / show chords"],
  ["T", "Back to top"],
];

const SETLIST: Row = ["N / B", "Next / previous song in the setlist"];
const CHEATSHEET: Row = ["?", "This cheatsheet"];

interface Props {
  /** Where it was opened from. */
  mode: "edit" | "play";
  /** Play mode only: the song is the person's own, so E and S do something. */
  canEdit?: boolean;
  /** Play mode only: the song was opened from a setlist, so N and B do something. */
  inSetlist?: boolean;
  onClose: () => void;
}

export function shortcutGroups({ mode, canEdit, inSetlist }: Omit<Props, "onClose">): { group: string; rows: Row[] }[] {
  if (mode === "edit") {
    return [
      { group: "Editing", rows: EDITING },
      { group: "Navigate", rows: [["P", "Play mode"], ["E", "Back to edit"], ["S", "Song library"], CHEATSHEET] },
      { group: "Play mode", rows: PLAYING },
    ];
  }
  return [
    { group: "Play mode", rows: inSetlist ? [...PLAYING, SETLIST] : PLAYING },
    { group: "Navigate", rows: canEdit ? [["E", "Back to edit"], ["S", "Song library"], CHEATSHEET] : [CHEATSHEET] },
  ];
}

export default function ShortcutsDialog({ mode, canEdit, inSetlist, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-bold text-zinc-900">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">✕</button>
        </div>
        <div className="px-6 py-4 space-y-5">
          {shortcutGroups({ mode, canEdit, inSetlist }).map((g) => (
            <div key={g.group}>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord mb-2">{g.group}</p>
              <div className="space-y-1.5">
                {g.rows.map(([keys, what]) => (
                  <div key={keys} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-zinc-600">{what}</span>
                    <kbd className="shrink-0 text-[11px] font-mono font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-md px-2 py-0.5">{keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {mode === "edit" && (
          <p className="px-6 pb-5 text-xs text-zinc-400">
            Tip: drag a chord to move it · double-click a chord to rename it.
          </p>
        )}
      </div>
    </div>
  );
}

/** The little keyboard, for the buttons that open the cheatsheet. */
export function KeyboardIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path strokeLinecap="round" d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
    </svg>
  );
}
