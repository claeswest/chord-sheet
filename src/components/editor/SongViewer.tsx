"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SongLine } from "@/types/song";
import { DEFAULT_STYLE, MONO_STACK, backgroundStyle, hexToRgba } from "@/lib/songStyle";
import LoadingNotes from "@/components/ui/LoadingNotes";
import type { SongStyle } from "@/lib/songStyle";
import { downloadPdf } from "@/lib/pdfExport";
import PrintView from "./PrintView";

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
  isShared?: boolean; // hides the share button on public share pages
}

// Pixels per millisecond at each speed step (display-rate independent)
const SPEED_PX_PER_MS: Record<number, number> = {
  1: 0.00375, 2: 0.00625, 3: 0.0095, 4: 0.013, 5: 0.017,
  6: 0.02125, 7: 0.02625, 8: 0.032, 9: 0.03875, 10: 0.04625,
  11: 0.055, 12: 0.065, 13: 0.07625, 14: 0.08875, 15: 0.1025,
  16: 0.1175, 17: 0.135, 18: 0.15375, 19: 0.175, 20: 0.2,
};
const MAX_SPEED = 20;

export default function SongViewer({ title, artist, lines, onEdit, songStyle, songId, loading = false, isShared = false }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollPosRef = useRef(0); // float position we own — never read back from DOM
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const speedKey = songId ? `scrollSpeed:${songId}` : null;
  const savedSpeed = speedKey && typeof window !== "undefined" ? Number(localStorage.getItem(speedKey) ?? 3) : 3;

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(isNaN(savedSpeed) ? 3 : savedSpeed);
  const [sizeAdjust, setSizeAdjust] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? -3 : 0
  );
  const [showControls, setShowControls] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
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
      if (e.key === "t" || e.key === "T") scrollToTop();
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

  // Show controls and (re)start the hide timer.
  // While playing: hide after 800 ms of inactivity.
  // While paused:  hide after 3 s so the sheet stays readable.
  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const delay = playingRef.current ? 800 : 3000;
    hideTimerRef.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  // Kick off the timer whenever play state changes
  useEffect(() => {
    revealControls();
  }, [playing, revealControls]);

  // Scroll loop — rAF-driven for consistent timing at the display's refresh rate.
  // scrollPosRef accumulates fractional pixels; we only call scrollBy once a
  // whole pixel is ready — this works reliably across all browsers/devices.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
      return;
    }
    scrollPosRef.current = 0;
    lastTimeRef.current = null;

    const step = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const elapsed = Math.min(timestamp - lastTimeRef.current, 100); // cap for tab-switch gaps
        scrollPosRef.current += SPEED_PX_PER_MS[speed] * elapsed;
        const whole = Math.floor(scrollPosRef.current);
        if (whole >= 1) {
          scrollRef.current?.scrollBy({ top: whole });
          scrollPosRef.current -= whole;
        }
      }
      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative z-20">
        <div className="max-w-2xl mx-auto px-5 sm:px-10 pt-16 pb-64">
          {/* Song header */}
          <div className="mb-10" style={{ textAlign: s.titleAlign ?? "center" }}>
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
                const sectionSize = (s.section?.fontSize ?? (s.lyrics.fontSize ?? 14) - 3) + sizeAdjust;
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
        className={`fixed top-0 left-0 right-0 z-30 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ transition: showControls ? "opacity 200ms ease-in" : "opacity 1200ms ease-out" }}
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
        className={`fixed bottom-0 left-0 right-0 z-30 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ transition: showControls ? "opacity 200ms ease-in" : "opacity 1200ms ease-out" }}
      >
        {/* Gentle gradient fade — covers just enough above the buttons */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" style={{ top: "-64px" }} />
        <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 sm:px-6 sm:py-5">

          {/* ── Row 1: action buttons + play ── */}
          <div className="flex items-center gap-2">
            {/* Edit button — hidden on public share pages */}
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-white/70 hover:text-white text-sm px-2.5 py-1.5 rounded-lg border border-white/20 hover:border-white/50 transition-colors backdrop-blur-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 0 1 2.828 0l.172.172a2 2 0 0 1 0 2.828L12 16H9v-3z"/>
                </svg>
                <span className="hidden sm:inline">Edit</span>
                <kbd className="hidden sm:inline text-xs text-white/40 font-mono">[E]</kbd>
              </button>
            )}

            {/* Share / copy link — hidden on public share pages */}
            {!isShared && (
              <button
                onClick={handleShare}
                disabled={shareLoading}
                className={`text-sm px-2.5 py-1.5 rounded-lg border transition-colors backdrop-blur-sm flex items-center gap-1.5 disabled:opacity-50 ${
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
                <span className="hidden sm:inline">{shareFlash ? "Copied!" : "Share"}</span>
              </button>
            )}

            {/* PDF download */}
            <button
              onClick={async () => { setPdfLoading(true); try { await downloadPdf(`${title || "chord-sheet"}.pdf`); } finally { setPdfLoading(false); } }}
              disabled={pdfLoading}
              className="text-white/70 hover:text-white text-sm px-2.5 py-1.5 rounded-lg border border-white/20 hover:border-white/50 transition-colors backdrop-blur-sm flex items-center gap-1.5 disabled:opacity-50"
              title="Download PDF"
            >
              {pdfLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2h10l4 4v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
                  <polyline points="15 2 15 7 20 7"/>
                  <text x="4.5" y="19.5" fontSize="6.5" fontWeight="700" fontFamily="Arial,sans-serif" fill="currentColor" stroke="none">PDF</text>
                  <line x1="12" y1="11" x2="12" y2="17"/>
                  <polyline points="9 14 12 17 15 14"/>
                </svg>
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Play / Pause */}
            <button
              onClick={(e) => { togglePlay(); (e.currentTarget as HTMLButtonElement).blur(); }}
              className="w-11 h-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-colors"
              title="Space to toggle"
            >
              {playing ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="5" y="4" width="3" height="12" rx="1" />
                  <rect x="12" y="4" width="3" height="12" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 4.2a1 1 0 0 0-1.3.95v9.7a1 1 0 0 0 1.3.95l9-4.85a1 1 0 0 0 0-1.9L6.3 4.2z" />
                </svg>
              )}
            </button>
          </div>

          {/* ── Row 2 (wraps on mobile): speed + font size ── */}
          <div className="flex items-center gap-3 pl-1 border-l border-white/20">
            {/* Speed */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/50 text-xs tabular-nums w-4 text-right">{speed}</span>
              <span className="hidden sm:inline text-white/60 text-xs">Slow</span>
              <input
                type="range"
                min={1}
                max={MAX_SPEED}
                value={speed}
                onChange={(e) => { setSpeed(Number(e.target.value)); revealControls(); }}
                className="w-24 sm:w-28 accent-indigo-400"
                title="← → to adjust"
              />
              <span className="hidden sm:inline text-white/60 text-xs">Fast</span>
            </div>

            {/* Font size */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSizeAdjust(s => Math.max(-6, s - 1)); revealControls(); }}
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded transition-colors text-sm"
                title="− to shrink"
              >
                A−
              </button>
              <span className="text-white/35 text-xs w-5 text-center tabular-nums">{lyricSize}</span>
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
      </div>

      {/* Hidden print view — required for PDF export */}
      <PrintView title={title} artist={artist} lines={lines} songStyle={songStyle} watermark />

      {/* Scroll to top button — appears once scrolled down, sits above the control bar */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top [T]"
        className={`fixed bottom-36 right-5 z-50 w-11 h-11 flex flex-col items-center justify-center gap-0.5 rounded-2xl backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 group ${
          scrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 4px 20px rgba(99,102,241,0.5)" }}
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-[9px] font-semibold tracking-wider text-white/70 uppercase leading-none">Top</span>
      </button>
    </div>
  );
}
