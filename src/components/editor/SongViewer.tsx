"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollAccRef = useRef(0); // accumulates sub-pixel amounts
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [sizeAdjust, setSizeAdjust] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  const s = songStyle ?? DEFAULT_STYLE;
  const lyricSize = (s.lyrics.fontSize ?? 14) + sizeAdjust;
  const chordSize = (s.chords.fontSize ?? 12) + sizeAdjust;
  const titleSize = (s.title.fontSize ?? 20) + sizeAdjust;

  // Load any Google Fonts on mount/change
  // [E] = back to edit, [P] = stay / already in play (no-op here)
  useEffect(() => {
    if (!onEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "e" || e.key === "E") onEdit();
      if (e.key === "m" || e.key === "M") router.push("/songs");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEdit]);

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

  // Wake lock — keep screen on while playing
  useEffect(() => {
    if (playing) {
      navigator.wakeLock?.request("screen").then((lock) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    } else {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [playing]);

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

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setPlaying(false);
  }, []);

  // Track whether user has scrolled down enough to show the button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 120);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
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
                  {hasChords && (() => {
                    // Compute overlap-free display positions
                    const CHORD_GAP = 6;
                    const lyricFam = s.lyrics.fontFamily ?? MONO_STACK;
                    const chordFam = s.chords.fontFamily ?? MONO_STACK;
                    const raw = line.chords.map((c) => ({
                      id: c.id,
                      chord: c.chord,
                      px: line.text
                        ? measureWidth(line.text.slice(0, c.position), lyricSize, lyricFam)
                        : c.position * measureWidth("M", lyricSize, lyricFam),
                    }));
                    raw.sort((a, b) => a.px - b.px);
                    let prevRight = -Infinity;
                    const positions = new Map<string, number>();
                    for (const item of raw) {
                      const x = Math.max(item.px, prevRight + CHORD_GAP);
                      positions.set(item.id, x);
                      prevRight = x + measureWidth(item.chord, chordSize, chordFam);
                    }
                    return (
                      <div className="absolute top-0 left-0 w-full" style={{ height: "1.5em" }}>
                        {line.chords.map((chord) => (
                          <span
                            key={chord.id}
                            className="absolute whitespace-nowrap"
                            style={{
                              left: positions.get(chord.id) ?? 0,
                              fontSize: chordSize,
                              fontFamily: chordFam,
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
                    );
                  })()}
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
              className="text-white/70 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/50 transition-colors backdrop-blur-sm flex items-center gap-2"
            >
              ← Edit <kbd className="text-xs text-white/40 font-mono">[E]</kbd>
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
              title="← → to adjust"
            />
            <span className="text-white/60 text-xs">Fast</span>
            <span className="text-white/50 text-xs w-6 text-right tabular-nums">{speed}</span>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSizeAdjust(s => Math.max(-6, s - 1))}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors text-sm"
              title="− to shrink"
            >
              A-
            </button>
            <span className="text-white/50 text-xs w-6 text-center tabular-nums">{lyricSize}</span>
            <button
              onClick={() => setSizeAdjust(s => Math.min(14, s + 1))}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors text-sm"
              title="+ to grow"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Scroll to top button — appears once scrolled down */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 text-zinc-800 font-medium text-sm shadow-lg border border-zinc-200 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl ${
          scrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        Top
      </button>
    </div>
  );
}
