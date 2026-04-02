"use client";

import { useState, useRef } from "react";
import type { SectionHeader } from "@/types/song";

const QUICK_LABELS = ["Intro", "Verse", "Chorus", "Bridge", "Pre-Chorus", "Outro", "Solo", "Interlude"];

interface Props {
  section: SectionHeader;
  onUpdate: (label: string) => void;
  onDelete: () => void;
}

export default function SectionHeaderBlock({ section, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onUpdate(trimmed);
    setEditing(false);
  };

  return (
    <div className="group/section flex items-center gap-3 pt-6 pb-1">
      {editing ? (
        <>
          <input
            ref={inputRef}
            autoFocus
            defaultValue={section.label}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget.value);
              if (e.key === "Escape") setEditing(false);
            }}
            className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-300 rounded px-2 py-0.5 outline-none w-28"
          />
          <div className="flex flex-wrap gap-1">
            {QUICK_LABELS.map((l) => (
              <button
                key={l}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent onBlur before click
                  onUpdate(l);
                  setEditing(false);
                }}
                className="text-xs px-2 py-0.5 bg-zinc-100 hover:bg-indigo-100 text-zinc-500 hover:text-indigo-600 rounded transition-colors"
              >
                {l}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {section.label}
        </button>
      )}

      <div className="flex-1 h-px bg-zinc-100" />

      <button
        onClick={onDelete}
        className="opacity-0 group-hover/section:opacity-100 group-hover/row:opacity-100 text-zinc-300 hover:text-red-400 transition-opacity"
        tabIndex={-1}
        title="Delete section"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2l8 8M10 2l-8 8"/>
        </svg>
      </button>
    </div>
  );
}
