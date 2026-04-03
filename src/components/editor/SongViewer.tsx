"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { SongLine } from "@/types/song";

const FONT_SPEC = (size: number) =>
  `${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

function measureWidth(text: string, fontSize: number): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT_SPEC(fontSize);
  return ctx.measureText(text).width;
}

interface Props {
  title: string;
  artist: string;
  lines: SongLine[];
  onEdit: () => void;
}

const SPEED_PX_PER_TICK: Record<number, number> = {
  1: 0.3, 2: 0.6, 3: 0.9, 4: 1.3, 5: 1.8,
  6: 2.4, 7: 3.1, 8: 4.0, 9: 5.0, 10: 6.5,
};
const TICK_MS = 40; // ~25fps

export default function SongViewer({ title, artist, lines, onEdit }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(14);
  const [showControls, setShowControls] = useState(true);

  // Auto-hide controls after 3s of playing
  useEffect(() => {
    if (!playing) { setShowControls(true); return; }
    const t = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(t);
  }, [playing]);

  // Scroll loop
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        scrollRef.current?.scrollBy({ top: SPEED_PX_PER_TICK[speed] });
      }, TICK_MS);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed]);

  // Spacebar to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setPlaying((p) => !p);
        setShowControls(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
    setShowControls(true);
  }, []);

  return (
    <div
      className="relative flex flex-col h-screen bg-white"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="max-w-2xl mx-auto px-10 pt-16 pb-40"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "14px" }}
        >
          {/* Song header */}
          <div className="mb-10 text-center">
            <h1
              className="font-bold text-zinc-900 leading-tight"
              style={{ fontSize: fontSize + 6 }}
            >
              {title || "Untitled Song"}
            </h1>
            {artist && (
              <p className="text-zinc-500 mt-1" style={{ fontSize: fontSize - 1 }}>
                {artist}
              </p>
            )}
          </div>

          {/* Lines */}
          <div className="space-y-0">
            {lines.map((line) => {
              if (line.type === "section") {
                return (
                  <div key={line.id} className="pt-8 pb-1">
                    <span
                      className="font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-0.5"
                      style={{ fontSize: fontSize - 3 }}
                    >
                      {line.label}
                    </span>
                  </div>
                );
              }

              const hasChords = line.chords.length > 0;
              return (
                <div key={line.id} className="relative" style={{ paddingTop: hasChords ? "1.6em" : 0 }}>
                  {/* Chord row */}
                  {hasChords && (
                    <div className="absolute top-0 left-0 w-full" style={{ height: "1.5em" }}>
                      {line.chords.map((chord) => (
                        <span
                          key={chord.id}
                          className="absolute font-bold text-indigo-600 whitespace-nowrap"
                          style={{
                            left: measureWidth(line.text.slice(0, chord.position), fontSize),
                            fontSize: fontSize - 2,
                            top: 0,
                          }}
                        >
                          {chord.chord}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Lyric */}
                  <div
                    className="text-zinc-800 whitespace-pre"
                    style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize, lineHeight: "1.25rem" }}
                  >
                    {line.text || "\u00A0"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div
        className={`fixed bottom-0 left-0 right-0 transition-opacity duration-500 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
          {/* Edit button */}
          <button
            onClick={onEdit}
            className="text-white/70 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/50 transition-colors backdrop-blur-sm"
          >
            ← Edit
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-11 h-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-colors"
            title="Space to toggle"
          >
            {playing ? (
              // Pause icon
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <rect x="5" y="4" width="3" height="12" rx="1" />
                <rect x="12" y="4" width="3" height="12" rx="1" />
              </svg>
            ) : (
              // Play icon
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 4.2a1 1 0 0 0-1.3.95v9.7a1 1 0 0 0 1.3.95l9-4.85a1 1 0 0 0 0-1.9L6.3 4.2z" />
              </svg>
            )}
          </button>

          {/* Speed */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">Slow</span>
            <input
              type="range"
              min={1}
              max={10}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24 accent-indigo-400"
            />
            <span className="text-white/60 text-xs">Fast</span>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors text-sm"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize((s) => Math.min(28, s + 1))}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors text-sm"
            >
              A+
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
