"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { LyricLine } from "@/types/song";
import type { SongStyle } from "@/lib/songStyle";
import { MONO_STACK } from "@/lib/songStyle";

interface Props {
  line: LyricLine;
  activeChord: string | null;
  onClearActiveChord: () => void;
  onUpdate: (text: string) => void;
  onAddChord: (position: number, chord: string) => void;
  onUpdateChord: (chordId: string, chord: string) => void;
  onMoveChord: (chordId: string, position: number) => void;
  onDeleteChord: (chordId: string) => void;
  onAddLineAfter: () => void;
  onDelete: () => void;
  songStyle?: SongStyle;
}

function measureWidth(text: string, size: number, family: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${size}px ${family}`;
  return ctx.measureText(text).width;
}

export default function LyricLineEditor({
  line,
  activeChord,
  onClearActiveChord,
  onUpdate,
  onAddChord,
  onUpdateChord,
  onMoveChord,
  onDeleteChord,
  onAddLineAfter,
  onDelete,
  songStyle,
}: Props) {
  const chordAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived style values
  const lyricFont = songStyle?.lyrics?.fontFamily ?? MONO_STACK;
  const lyricSize = songStyle?.lyrics?.fontSize ?? 14;
  const chordFont = songStyle?.chords?.fontFamily ?? MONO_STACK;
  const chordSize = songStyle?.chords?.fontSize ?? 12;
  const chordColor = songStyle?.chords?.color ?? "#4f46e5";

  // Inline "add chord" popup
  const [addingAtPx, setAddingAtPx] = useState<number | null>(null);
  const [addingText, setAddingText] = useState("");
  const addingInputRef = useRef<HTMLInputElement>(null);

  // Chord being edited inline
  const [editingChordId, setEditingChordId] = useState<string | null>(null);

  // Drag state via refs to avoid stale closures
  const draggingRef = useRef<{
    chordId: string;
    startX: number;
    startPos: number;
  } | null>(null);
  const onMoveChordRef = useRef(onMoveChord);
  useEffect(() => { onMoveChordRef.current = onMoveChord; }, [onMoveChord]);

  // Keep style refs up to date for use in event handlers
  const lyricSizeRef = useRef(lyricSize);
  const lyricFontRef = useRef(lyricFont);
  useEffect(() => { lyricSizeRef.current = lyricSize; }, [lyricSize]);
  useEffect(() => { lyricFontRef.current = lyricFont; }, [lyricFont]);

  // Global mouse listeners for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d || !chordAreaRef.current) return;
      const charWidth = measureWidth("M", lyricSizeRef.current, lyricFontRef.current);
      const dx = e.clientX - d.startX;
      const newPos = Math.max(0, d.startPos + Math.round(dx / charWidth));
      onMoveChordRef.current(d.chordId, newPos);
    };
    const handleMouseUp = () => { draggingRef.current = null; };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  function pxToCharPos(text: string, px: number): number {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i <= text.length; i++) {
      const w = measureWidth(text.slice(0, i), lyricSize, lyricFont);
      const dist = Math.abs(w - px);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  // ── Chord area click ─────────────────────────────────────────────────────────

  const handleChordAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-chord-token]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;

      if (activeChord) {
        const pos = pxToCharPos(line.text, px);
        onAddChord(pos, activeChord);
        onClearActiveChord();
        return;
      }

      setAddingAtPx(px);
      setAddingText("");
      setTimeout(() => addingInputRef.current?.focus(), 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChord, line.text, onAddChord, onClearActiveChord, lyricFont, lyricSize]
  );

  const confirmAdd = useCallback(() => {
    if (addingAtPx === null || !addingText.trim()) {
      setAddingAtPx(null);
      return;
    }
    const pos = pxToCharPos(line.text, addingAtPx);
    onAddChord(pos, addingText.trim());
    setAddingAtPx(null);
    setAddingText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addingAtPx, addingText, line.text, onAddChord, lyricFont, lyricSize]);

  // ── Lyric input keyboard ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onAddLineAfter();
        // Focus next input after React re-renders
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>("[data-lyric-input]");
          const idx = Array.from(inputs).indexOf(inputRef.current!);
          inputs[idx + 1]?.focus();
        }, 0);
      } else if (e.key === "Backspace" && line.text === "" && line.chords.length === 0) {
        e.preventDefault();
        onDelete();
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>("[data-lyric-input]");
          inputs[inputs.length - 1]?.focus();
        }, 0);
      }
    },
    [line, onAddLineAfter, onDelete]
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const chordLeftPx = (position: number) => {
    if (!line.text) {
      // No lyric text — treat position as a character column index
      const charWidth = measureWidth("M", lyricSize, lyricFont);
      return position * charWidth;
    }
    return measureWidth(line.text.slice(0, position), lyricSize, lyricFont);
  };

  // Compute display X positions that guarantee no two chord labels overlap.
  // Walk chords sorted by raw pixel position; if one would overlap the previous,
  // push it rightward by the deficit + a small gap.
  const CHORD_GAP = 6; // px minimum gap between chord labels
  const chordDisplayPositions: Map<string, number> = (() => {
    const raw = line.chords.map((c) => ({ id: c.id, chord: c.chord, px: chordLeftPx(c.position) }));
    raw.sort((a, b) => a.px - b.px);
    let prevRight = -Infinity;
    const out = new Map<string, number>();
    for (const item of raw) {
      const x = Math.max(item.px, prevRight + CHORD_GAP);
      out.set(item.id, x);
      prevRight = x + measureWidth(item.chord, chordSize, chordFont);
    }
    return out;
  })();

  return (
    <div className="group/line relative py-0.5">
      {/* ── Chord row ────────────────────────────────────────────────────────── */}
      <div
        ref={chordAreaRef}
        className="relative h-6 cursor-crosshair select-none"
        onClick={handleChordAreaClick}
        title={activeChord ? `Click to place "${activeChord}"` : "Click to add a chord"}
      >
        {line.chords.map((chord) => (
          <div
            key={chord.id}
            data-chord-token
            className="absolute top-0"
            style={{ left: chordDisplayPositions.get(chord.id) ?? chordLeftPx(chord.position) }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              draggingRef.current = {
                chordId: chord.id,
                startX: e.clientX,
                startPos: chord.position,
              };
            }}
          >
            {editingChordId === chord.id ? (
              <input
                autoFocus
                defaultValue={chord.chord}
                className="w-16 font-bold text-indigo-700 bg-white border border-indigo-400 rounded px-1 outline-none shadow-sm"
                style={{
                  fontSize: chordSize,
                  fontFamily: chordFont,
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val) onUpdateChord(chord.id, val);
                  else onDeleteChord(chord.id);
                  setEditingChordId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = e.currentTarget.value.trim();
                    if (val) onUpdateChord(chord.id, val);
                    else onDeleteChord(chord.id);
                    setEditingChordId(null);
                  }
                  if (e.key === "Escape") setEditingChordId(null);
                  if ((e.key === "Delete" || e.key === "Backspace") && e.currentTarget.value === "") {
                    onDeleteChord(chord.id);
                    setEditingChordId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="whitespace-nowrap cursor-grab active:cursor-grabbing px-0.5 hover:bg-indigo-50 rounded"
                style={{
                  fontSize: chordSize,
                  fontFamily: chordFont,
                  fontWeight: songStyle?.chords?.bold !== false ? "bold" : "normal",
                  fontStyle: songStyle?.chords?.italic ? "italic" : "normal",
                  color: chordColor,
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingChordId(chord.id);
                }}
                title="Drag to move · Double-click to edit"
              >
                {chord.chord}
              </span>
            )}
          </div>
        ))}

        {/* Inline add-chord input */}
        {addingAtPx !== null && (
          <input
            ref={addingInputRef}
            value={addingText}
            onChange={(e) => setAddingText(e.target.value)}
            onBlur={confirmAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAdd();
              if (e.key === "Escape") setAddingAtPx(null);
            }}
            placeholder="Am"
            className="absolute top-0 w-14 font-bold text-indigo-700 bg-white border border-indigo-400 rounded px-1 outline-none shadow-sm z-10"
            style={{ fontSize: chordSize, left: addingAtPx, fontFamily: chordFont }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* ── Lyric input ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          data-lyric-input
          value={line.text}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type lyrics here…"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none placeholder:text-zinc-300 py-0.5 leading-5"
          style={{
            fontFamily: lyricFont,
            fontSize: lyricSize,
            fontWeight: songStyle?.lyrics?.bold ? "bold" : "normal",
            fontStyle: songStyle?.lyrics?.italic ? "italic" : "normal",
            color: songStyle?.lyrics?.color ?? "#27272a",
            padding: 0,
            margin: 0,
          }}
        />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/line:opacity-100 group-hover/row:opacity-100 text-zinc-500 hover:text-red-500 transition-opacity shrink-0 rounded-md bg-white/80 shadow-sm border border-zinc-200 p-1"
          tabIndex={-1}
          title="Delete line"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
