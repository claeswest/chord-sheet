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
  onAddSectionAfter: (label: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  songStyle?: SongStyle;
}

function measureWidth(text: string, size: number, family: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${size}px ${family}`;
  return ctx.measureText(text).width;
}

const SECTION_LABELS = ["Verse", "Chorus", "Bridge", "Intro", "Outro", "Pre-Chorus", "Solo"];

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
  onAddSectionAfter,
  onDelete,
  onDuplicate,
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

  // Ghost chord preview — tracks mouse X while activeChord is set
  const [chordHoverPx, setChordHoverPx] = useState<number | null>(null);

  // Section picker popup
  const [showSectionPicker, setShowSectionPicker] = useState(false);

  // Chord being edited inline
  const [editingChordId, setEditingChordId] = useState<string | null>(null);

  // Drag state via refs to avoid stale closures
  // startMouseX = clientX when drag began; startPixelX = chord's pixel position at that moment
  const draggingRef = useRef<{
    chordId: string;
    startMouseX: number;
    startPixelX: number;
  } | null>(null);
  const onMoveChordRef = useRef(onMoveChord);
  useEffect(() => { onMoveChordRef.current = onMoveChord; }, [onMoveChord]);

  // Keep style + text refs up to date for use in event handlers
  const lyricSizeRef = useRef(lyricSize);
  const lyricFontRef = useRef(lyricFont);
  const lineTextRef  = useRef(line.text);
  useEffect(() => { lyricSizeRef.current = lyricSize; }, [lyricSize]);
  useEffect(() => { lyricFontRef.current = lyricFont; }, [lyricFont]);
  useEffect(() => { lineTextRef.current  = line.text;  }, [line.text]);

  // Global mouse listeners for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d || !chordAreaRef.current) return;
      const size = lyricSizeRef.current;
      const font = lyricFontRef.current;
      const text = lineTextRef.current;
      const charW = measureWidth("M", size, font);

      // Target pixel = where the chord should be now
      const targetPx = d.startPixelX + (e.clientX - d.startMouseX);

      // Map pixel → character position (same logic as pxToCharPos)
      let newPos: number;
      const textWidth = text ? measureWidth(text, size, font) : 0;
      if (targetPx > textWidth) {
        const extra = Math.round((targetPx - textWidth) / charW);
        newPos = text.length + Math.max(0, extra);
      } else {
        let best = 0, bestDist = Infinity;
        for (let i = 0; i <= text.length; i++) {
          const w = measureWidth(text.slice(0, i), size, font);
          const dist = Math.abs(w - targetPx);
          if (dist < bestDist) { bestDist = dist; best = i; }
        }
        newPos = best;
      }
      onMoveChordRef.current(d.chordId, Math.max(0, newPos));
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
    const textWidth = text ? measureWidth(text, lyricSize, lyricFont) : 0;
    if (px > textWidth) {
      // Beyond the last character — extend using "M" width as a unit
      const charWidth = measureWidth("M", lyricSize, lyricFont);
      const extra = Math.round((px - textWidth) / charWidth);
      return text.length + Math.max(1, extra);
    }
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
    const charWidth = measureWidth("M", lyricSize, lyricFont);
    if (!line.text) {
      return position * charWidth;
    }
    if (position >= line.text.length) {
      const textWidth = measureWidth(line.text, lyricSize, lyricFont);
      return textWidth + (position - line.text.length) * charWidth;
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
    <div className="group/line relative py-0.5 px-1 rounded-lg transition-colors hover:bg-[#302b63]/15 border-l-2 border-transparent hover:border-[#302b63]/40">
      {/* ── Chord row ────────────────────────────────────────────────────────── */}
      <div
        ref={chordAreaRef}
        className={`relative w-full select-none transition-all duration-150 ${
          line.chords.length > 0 || addingAtPx !== null ? "h-6" : "h-0 group-hover/line:h-6"
        } ${activeChord ? "cursor-none" : "cursor-crosshair"}`}
        onClick={handleChordAreaClick}
        onMouseMove={(e) => {
          if (!activeChord) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setChordHoverPx(e.clientX - rect.left);
        }}
        onMouseLeave={() => setChordHoverPx(null)}
        title={activeChord ? `Click to place "${activeChord}"` : "Click to add a chord"}
      >
        {line.chords.map((chord) => (
          <div
            key={chord.id}
            data-chord-token
            className="group/chord absolute top-0 flex items-center"
            style={{ left: chordDisplayPositions.get(chord.id) ?? chordLeftPx(chord.position) }}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest("[data-chord-delete]")) return;
              e.preventDefault();
              e.stopPropagation();
              draggingRef.current = {
                chordId: chord.id,
                startMouseX: e.clientX,
                startPixelX: chordLeftPx(chord.position),
              };
            }}
          >
            {editingChordId === chord.id ? (
              <input
                autoFocus
                defaultValue={chord.chord}
                className="w-16 font-bold text-[#302b63] bg-[#302b63]/10 border border-[#302b63]/30 rounded px-1 outline-none shadow-sm"
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
              <>
                <span
                  className="whitespace-nowrap cursor-grab active:cursor-grabbing px-0.5 hover:bg-white/50 rounded"
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
                <button
                  data-chord-delete
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onDeleteChord(chord.id); }}
                  className="opacity-0 group-hover/chord:opacity-100 transition-opacity text-zinc-600 hover:text-red-500 leading-none ml-0.5"
                  title="Remove chord"
                  tabIndex={-1}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 1l8 8M9 1l-8 8"/>
                  </svg>
                </button>
              </>
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
            className="absolute top-0 w-14 font-bold text-[#302b63] bg-[#302b63]/10 border border-[#302b63]/30 rounded px-1 outline-none shadow-sm z-10"
            style={{ fontSize: chordSize, left: addingAtPx, fontFamily: chordFont }}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Ghost chord — follows cursor when activeChord is set */}
        {activeChord && chordHoverPx !== null && (
          <span
            className="absolute top-0 pointer-events-none opacity-70"
            style={{
              left: chordLeftPx(pxToCharPos(line.text, chordHoverPx)),
              fontSize: chordSize,
              fontFamily: chordFont,
              fontWeight: "bold",
              color: chordColor,
            }}
          >
            {activeChord}
          </span>
        )}
      </div>

      {/* Divider between chord row and lyric row */}
      {(line.chords.length > 0 || addingAtPx !== null) && (
        <div className="w-full h-px bg-[#302b63]/10 mb-0.5 opacity-0 group-hover/line:opacity-100 transition-opacity" />
      )}

      {/* ── Lyric input ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          data-lyric-input
          value={line.text}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={line.chords.length > 0 ? "" : "Type lyrics here…"}
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
        {/* Add line below */}
        <button
          onClick={onAddLineAfter}
          className="opacity-0 group-hover/line:opacity-100 group-hover/row:opacity-100 text-zinc-600 hover:text-indigo-600 transition-all shrink-0 rounded-md p-1"
          tabIndex={-1}
          title="Add line below (Enter)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        {/* Section insert */}
        <div className="relative opacity-0 group-hover/line:opacity-100 transition-all shrink-0">
          <button
            onClick={() => setShowSectionPicker((v) => !v)}
            className="text-zinc-600 hover:text-indigo-600 transition-colors rounded-md p-1"
            tabIndex={-1}
            title="Insert section below"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M12 12v4M10 14h4"/>
            </svg>
          </button>
          {showSectionPicker && (
            <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-lg border border-zinc-200 py-1.5 z-50 flex flex-col min-w-[120px]">
              {SECTION_LABELS.map((label) => (
                <button
                  key={label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onAddSectionAfter(label); setShowSectionPicker(false); }}
                  className="px-3 py-1.5 text-sm text-left text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 transition-colors"
                >
                  + {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onDuplicate}
          className="opacity-0 group-hover/line:opacity-100 group-hover/row:opacity-100 text-zinc-600 hover:text-indigo-600 transition-all shrink-0 rounded-md p-1"
          tabIndex={-1}
          title="Duplicate line"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/line:opacity-100 group-hover/row:opacity-100 text-zinc-600 hover:text-red-500 transition-all shrink-0 rounded-md p-1"
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
