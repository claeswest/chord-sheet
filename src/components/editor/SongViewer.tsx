"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { SongLine } from "@/types/song";
import { DEFAULT_STYLE, MONO_STACK, backgroundStyle } from "@/lib/songStyle";
import type { SongStyle } from "@/lib/songStyle";

// Reuse a single canvas context across all measurements
let _ctx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d")!;
  return _ctx;
}
function measureWidth(text: string, size: number, family: string): number {
  const ctx = getCtx();
  ctx.font = `${size}px ${family}`;
  return ctx.measureText(text).width;
}

interface Props {
  title: string;
  artist: string;
  lines: SongLine[];
  onEdit?: () => void;
  songStyle?: SongStyle;
}

const SPEED_PX_PER_TICK: Record<number, number> = {
  1: 0.15, 2: 0.25, 3: 0.38, 4: 0.52, 5: 0.68,
  6: 0.85, 7: 1.05, 8: 1.28, 9: 1.55, 10: 1.85,
  11: 2.20, 12: 2.60, 13: 3.05, 14: 3.55, 15: 4.10,
  16: 4.70, 17: 5.40, 18: 6.15, 19: 7.00, 20: 8.00,
};
const MAX_SPEED = 20;
const TICK_MS = 40; // ~25fps

export default function SongViewer({ title, artist, lines, onEdit, songStyle }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollAccRef = useRef(0); // accumulates sub-pixel amounts

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [sizeAdjust, setSizeAdjust] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const s = songStyle ?? DEFAULT_STYLE;
  const lyricSize = (s.lyrics.fontSize ?? 14) + sizeAdjust;
  const chordSize = (s.chords.fontSize ?? 12) + sizeAdjust;
  const titleSize = (s.title.fontSize ?? 20) + sizeAdjust;

  // Load any Google Fonts on mount/change
  useEffect(() => {
    [s.title.fontFamily, s.lyrics.fontFamily, s.chords.fontFamily].forEach(fam => {
      if (fam && !fam.startsWith("ui-monospace")) {
        import("@/lib/songStyle").then(({ ALL_FONTS, loadGoogleFont }) => {
          const font = ALL_FONTS.find(f => f.stack === fam);
          if (font) loadGoogleFont(font.url);
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.title.fontFamily, s.lyrics.fontFamily, s.chords.fontFamily]);

  // Auto-hide controls after 3s of playing
  useEffect(() => {
    if (!playing) { setShowControls(true); return; }
    const t = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(t);
  }, [playing]);

  // Scroll loop
  useEffect(() => {
    if (playing) {
      scrollAccRef.current = 0;
      intervalRef.current = setInterval(() => {
        scrollAccRef.current += SPEED_PX_PER_TICK[speed];
        const pixels = Math.floor(scrollAccRef.current);
        if (pixels >= 1) {
          scrollRef.current?.scrollBy({ top: pixels });
          scrollAccRef.current -= pixels;
        }
      }, TICK_MS);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed]);

  // Keyboard shortcuts: Space = play/pause, +/=/ArrowRight = faster, -/ArrowLeft = slower
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
        setShowControls(true);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setSpeed((s) => Math.min(MAX_SPEED, s + 1));
        setShowControls(true);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setSpeed((s) => Math.max(1, s - 1));
        setShowControls(true);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setSizeAdjust((s) => Math.min(14, s + 1));
        setShowControls(true);
      } else if (e.key === "-") {
        e.preventDefault();
        setSizeAdjust((s) => Math.max(-6, s - 1));
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
      className="relative flex flex-col h-screen"
      style={backgroundStyle(s)}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 pt-16 pb-40">
          {/* Song header */}
          <div className="mb-10 text-center">
            <h1
              className="leading-tight"
              style={{
                fontSize: titleSize,
                fontFamily: s.title.fontFamily ?? MONO_STACK,
                fontWeight: s.title.bold !== false ? "bold" : "normal",
                fontStyle: s.title.italic ? "italic" : "normal",
                color: s.title.color ?? "#18181b",
              }}
            >
              {title || "Untitled Song"}
            </h1>
            {artist && (
              <p
                className="mt-1"
                style={{
                  fontSize: (s.artist?.fontSize ?? 13) + sizeAdjust,
                  fontFamily: s.artist?.fontFamily ?? MONO_STACK,
                  fontWeight: s.artist?.bold ? "bold" : "normal",
                  fontStyle: s.artist?.italic ? "italic" : "normal",
                  color: s.artist?.color ?? "#71717a",
                }}
              >
                {artist}
              </p>
            )}
          </div>

          {/* Lines */}
          <div className="space-y-0">
            {lines.map((line) => {
              if (line.type === "section") {
                const sectionColor = s.chords.color ?? "#4f46e5";
                const align = s.sectionAlign ?? "left";
                const showDivider = s.sectionDivider ?? true;
                return (
                  <div
                    key={line.id}
                    className="pt-8 pb-1"
                    style={{ textAlign: align }}
                  >
                    <span
                      className="font-bold uppercase tracking-widest"
                      style={{ fontSize: lyricSize - 3, color: sectionColor }}
                    >
                      {line.label}
                    </span>
                    {showDivider && (
                      <div style={{ borderBottom: `1px solid ${sectionColor}`, opacity: 0.3, marginTop: 3 }} />
                    )}
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
                          className="absolute whitespace-nowrap"
                          style={{
                            left: measureWidth(line.text.slice(0, chord.position), lyricSize, s.lyrics.fontFamily ?? MONO_STACK),
                            fontSize: chordSize,
                            fontFamily: s.chords.fontFamily ?? MONO_STACK,
                            fontWeight: s.chords.bold !== false ? "bold" : "normal",
                            fontStyle: s.chords.italic ? "italic" : "normal",
                            color: s.chords.color ?? "#4f46e5",
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
                    className="whitespace-pre"
                    style={{
                      fontFamily: s.lyrics.fontFamily ?? MONO_STACK,
                      fontSize: lyricSize,
                      fontWeight: s.lyrics.bold ? "bold" : "normal",
                      fontStyle: s.lyrics.italic ? "italic" : "normal",
                      color: s.lyrics.color ?? "#27272a",
                      lineHeight: 1.35,
                    }}
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
          {/* Edit button — hidden on public share pages */}
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-white/70 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/50 transition-colors backdrop-blur-sm"
            >
              ← Edit
            </button>
          )}

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
              max={MAX_SPEED}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-28 accent-indigo-400"
              title={`Speed ${speed}/${MAX_SPEED} — use ←/→ or +/− to adjust`}
            />
            <span className="text-white/60 text-xs">Fast</span>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSizeAdjust(s => Math.max(-6, s - 1))}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors text-sm"
            >
              A-
            </button>
            <button
              onClick={() => setSizeAdjust(s => Math.min(14, s + 1))}
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
