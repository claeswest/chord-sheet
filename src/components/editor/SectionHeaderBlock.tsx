"use client";

import { useState, useRef } from "react";
import type { SectionHeader } from "@/types/song";

const QUICK_LABELS = ["Intro", "Verse", "Chorus", "Bridge", "Pre-Chorus", "Outro", "Solo", "Interlude"];

interface Props {
  section: SectionHeader;
  onUpdate: (label: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center";
  showDivider?: boolean;
}

export default function SectionHeaderBlock({ section, onUpdate, onDelete, onDuplicate, color = "#4f46e5", fontSize = 11, bold = true, italic = false, align = "left", showDivider = true }: Props) {
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
            className="uppercase tracking-widest rounded px-2 py-0.5 outline-none w-28"
            style={{ color, fontSize, fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal", borderColor: color, border: `1px solid ${color}`, background: `${color}18` }}
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
          className="uppercase tracking-widest transition-colors shrink-0"
          style={{ color, fontSize, fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal" }}
        >
          {section.label}
        </button>
      )}

      {/* Left-side divider line (center mode only) */}
      {showDivider && align === "center" && (
        <div className="flex-1 h-px order-first" style={{ background: color, opacity: 0.25 }} />
      )}
      {/* Right-side divider line */}
      {showDivider && (
        <div className="flex-1 h-px" style={{ background: color, opacity: 0.25 }} />
      )}

      <button
        onClick={onDuplicate}
        className="opacity-0 group-hover/section:opacity-100 group-hover/row:opacity-100 text-zinc-500 hover:text-indigo-600 transition-opacity rounded-md bg-white/80 shadow-sm border border-zinc-200 p-1"
        tabIndex={-1}
        title="Duplicate section"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover/section:opacity-100 group-hover/row:opacity-100 text-zinc-500 hover:text-red-500 transition-opacity rounded-md bg-white/80 shadow-sm border border-zinc-200 p-1"
        tabIndex={-1}
        title="Delete section"
      >
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 2l8 8M10 2l-8 8"/>
        </svg>
      </button>
    </div>
  );
}
