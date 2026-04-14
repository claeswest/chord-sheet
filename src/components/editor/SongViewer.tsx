"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SongLine } from "@/types/song";
import { DEFAULT_STYLE, MONO_STACK, backgroundStyle, hexToRgba } from "@/lib/songStyle";
import LoadingNotes from "@/components/ui/LoadingNotes";
import type { SongStyle } from "@/lib/songStyle";

// Reuse a single canvas context across all measurements
let _ctx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d")!;
  return _ctx;
}
function measureWidth(text: string, size: number, family: string): number {
  const ctx = getCtx();
  if (!ctx) return 0;
  ctx.font = `${size}px ${family}`;
  return ctx.measureText(text).width;
}

interface Props {
  title: string;
  artist: string;
  lines: SongLine[];
  onEdit?: () => void;
  songStyle?: SongStyle;
  songId?: string;
  loading?: boolean; // parent can keep overlay up while fetching data
}

const SPEED_PX_PER_TICK: Record<number, number> = {
  1: 0.15, 2: 0.25, 3: 0.38, 4: 0.52, 5: 0.68,
  6: 0.85, 7: 1.05, 8: 1.28, 9: 1.55, 10: 1.85,
  11: 2.20, 12: 2.60, 13: 3.05, 14: 3.55, 15: 4.10,
  16: 4.70, 17: 5.40, 18: 6.15, 19: 7.00, 20: 8.00,
};
const MAX_SPEED = 20;
const TICK_MS = 40; // ~25fps

export default function SongViewer({ title, artist, lines, onEdit, songStyle, songId, loading = false }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollAccRef = useRef(0); // accumulates sub-pixel amounts
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const speedKey = songId ? `scrollSpeed:${songId}` : null;
  const savedSpeed = speedKey && typeof window !== "undefined" ? Number(localStorage.getItem(speedKey) ?? 3) : 3;

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(isNaN(savedSpeed) ? 3 : savedSpeed);
  const [sizeAdjust, setSizeAdjust] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);
  const [fontSeq, setFontSeq] = useState(0); // increments when fonts finish loading → re-measures chords
  const [imgLoaded, setImgLoaded] = useState(false); // true once bg <img> is painted
  const bgImgRef = useRef<HTMLImageElement>(null);

  const s = songStyle ?? DEFAULT_STYLE;
  const lyricSize = (s.lyrics.fontSize ?? 14) + sizeAdjust;
  const chordSize = (s.chords.fontSize ?? 12) + sizeAdjust;
  const titleSize = (s.title.fontSize ?? 20) + sizeAdjust;

  // Persist speed to localStorage whenever it changes
  useEffect(() => {
    if (speedKey) localStorage.setItem(speedKey, String(speed));
  }, [speed, speedKey]);

  // Re-measure chord positions once all fonts have finished loading.
  // Without this, chords are positioned using fallback-font metrics and then
  // jump ~1 second later when the real Google Font renders.
  useEffect(() => {
    const handler = () => setFontSeq(n => n + 1);
    document.fonts.addEventListener("loadingdone", handler);
    // Also trigger immediately in case fonts are already loaded
    document.fonts.ready.then(handler);
    return () => document.fonts.removeEventListener("loadingdone", handler);
  }, []);

  // Load any Google Fonts on mount/change
  // [E] = back to edit, [P] = stay / already in play (no-op here)
  useEffect(() => {
    if (!onEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "e" || e.key === "E") onEdit();
      if (e.key === "s" || e.key === "S") router.push("/songs");
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

  // Keep playingRef in sync so revealControls closure is always fresh
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // Show controls and (re)start the 3s hide timer — only hides when playing
  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (playingRef.current) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2000);
    }
  }, []);

  // When play starts, kick off the timer; when it stops, always show controls
  useEffect(() => {
    if (playing) {
      revealControls();
    } else {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setShowControls(true);
    }
  }, [playing, revealControls]);

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
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
        revealControls();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setSpeed((s) => Math.min(MAX_SPEED, s + 1));
        revealControls();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setSpeed((s) => Math.max(1, s - 1));
        revealControls();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setSizeAdjust((s) => Math.min(14, s + 1));
        revealControls();
      } else if (e.key === "-") {
        e.preventDefault();
        setSizeAdjust((s) => Math.max(-6, s - 1));
        revealControls();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealControls]);

  // Reset and re-check whenever background image changes.
  // Base64 data URLs load synchronously — onLoad fires before React attaches
  // the handler. So we also check img.complete after mount.
  useEffect(() => {
    setImgLoaded(false);
    if (!s.backgroundImage) { setImgLoaded(true); return; }
    // If the <img> element is already decoded (data URL), mark ready immediately
    if (bgImgRef.current?.complete) {
      setImgLoaded(true);
    }
  }, [s.backgroundImage]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
    revealControls();
  }, [revealControls]);

  const handleShare = useCallback(async () => {
    // If already on a share page, just copy the current URL
    if (window.location.pathname.startsWith("/share/")) {
      await navigator.clipboard.writeText(window.location.href);
      setShareFlash(true);
      setTimeout(() => setShareFlash(false), 2000);
      return;
    }
    setShareLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, lines, style: songStyle }),
      });
      const { token } = await res.json();
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
      setShareFlash(true);
      setTimeout(() => setShareFlash(false), 2000);
    } finally {
      setShareLoading(false);
    }
  }, [title, artist, lines, songStyle]);

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
      className="relative isolate flex flex-col flex-1 min-h-0"
      style={backgroundStyle(s)}
      onMouseMove={revealControls}
    >
      {/* ── Background image — fades IN on load, crossfading with the overlay ── */}
      {s.backgroundImage && (
        <>
          <img
            ref={bgImgRef}
            key={s.backgroundImage}
            src={s.backgroundImage}
            alt=""
            aria-hidden
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 600ms ease",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: hexToRgba(s.background ?? "#ffffff", s.overlayOpacity ?? 0.5),
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 600ms ease",
            }}
          />
        </>
      )}

      {/* ── Loading overlay — crossfades OUT as image fades IN ── */}
      {(s.backgroundImage || loading) && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          style={{
            background: "rgba(48, 43, 99, 0.85)",
            opacity: (loading || !imgLoaded) ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        >
          <LoadingNotes overlay label="Loading…" />
        </div>
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative z-20">
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
                const sectionColor = s.section?.color ?? s.chords.color ?? "#4f46e5";
                const sectionSize = s.section?.fontSize ?? (lyricSize - 3);
                const sectionBold = s.section?.bold ?? true;
                const sectionItalic = s.section?.italic ?? false;
                const align = s.sectionAlign ?? "left";
                const showDivider = s.sectionDivider ?? true;
                return (
                  <div
                    key={line.id}
                    className="pt-8 pb-1"
                    style={{ textAlign: align }}
                  >
                    <span
                      className="uppercase tracking-widest"
                      style={{ fontSize: sectionSize, color: sectionColor, fontWeight: sectionBold ? "bold" : "normal", fontStyle: sectionItalic ? "italic" : "normal" }}
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
                    // fontSeq is read here so chord positions are recalculated after fonts load
                    void fontSeq;
                    const CHORD_GAP = 6;
                    const lyricFam = s.lyrics.fontFamily ?? MONO_STACK;
                    const chordFam = s.chords.fontFamily ?? MONO_STACK;
                    const raw = line.chords.map((c) => ({
                      id: c.id,
                      chord: c.chord,
                      px: (() => {
                        const charW = measureWidth("M", lyricSize, lyricFam);
                        if (!line.text) return c.position * charW;
                        if (c.position >= line.text.length) {
                          return measureWidth(line.text, lyricSize, lyricFam) + (c.position - line.text.length) * charW;
                        }
                        return measureWidth(line.text.slice(0, c.position), lyricSize, lyricFam);
                      })(),
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

      {/* Top bar — fades with controls */}
      <div
        className={`fixed top-0 left-0 right-0 z-30 transition-opacity duration-500 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center px-5 py-3 bg-gradient-to-b from-black/60 to-transparent">
          {/* Logo */}
          <Link href="/songs" className="text-sm font-bold tracking-tight text-white hover:opacity-75 transition-opacity px-3 py-1.5 rounded-lg bg-[#302b63]/40 backdrop-blur-sm" style={{ fontFamily: "var(--font-nunito)" }}>
            ChordSheet<span className="text-indigo-300">Maker</span>
          </Link>
          <div className="flex-1" />
          {/* Songs link */}
          <Link
            href="/songs"
            className="text-sm font-bold text-white hover:opacity-75 transition-opacity px-3 py-1.5 rounded-lg bg-[#302b63]/40 backdrop-blur-sm flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Songs
          </Link>
        </div>
      </div>

      {/* Controls overlay */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 transition-opacity duration-500 ${
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

          {/* Share / copy link */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors backdrop-blur-sm flex items-center gap-2 disabled:opacity-50 ${
              shareFlash
                ? "text-green-300 border-green-400/40"
                : "text-white/70 hover:text-white border-white/20 hover:border-white/50"
            }`}
            title="Copy shareable link"
          >
            {shareFlash ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : shareLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            )}
            {shareFlash ? "Copied!" : "Share"}
          </button>

          {/* Play / Pause */}
          <button
            onClick={(e) => { togglePlay(); (e.currentTarget as HTMLButtonElement).blur(); }}
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
              onChange={(e) => { setSpeed(Number(e.target.value)); revealControls(); }}
              className="w-28 accent-indigo-400"
              title="← → to adjust"
            />
            <span className="text-white/60 text-xs">Fast</span>
            <span className="text-white/50 text-xs w-6 text-right tabular-nums">{speed}</span>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setSizeAdjust(s => Math.max(-6, s - 1)); revealControls(); }}
              className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors text-sm"
              title="− to shrink"
            >
              A-
            </button>
            <span className="text-white/50 text-xs w-6 text-center tabular-nums">{lyricSize}</span>
            <button
              onClick={() => { setSizeAdjust(s => Math.min(14, s + 1)); revealControls(); }}
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
        className={`fixed bottom-24 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 text-zinc-800 font-medium text-sm shadow-lg border border-zinc-200 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl ${
          scrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
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
