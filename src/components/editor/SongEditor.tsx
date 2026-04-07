"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { SongLine, LyricLine, SectionHeader } from "@/types/song";
import LyricLineEditor from "./LyricLineEditor";
import SectionHeaderBlock from "./SectionHeaderBlock";
import SortableLine from "./SortableLine";
import ChordPalette from "./ChordPalette";
import SongViewer from "./SongViewer";
import ImportModal from "./ImportModal";
import FindReplaceModal from "./FindReplaceModal";
import StylePanel from "./StylePanel";
import { transposeSong, semitoneLabel } from "@/lib/transpose";
import PrintView from "./PrintView";
import { saveSong, type StoredSong } from "@/lib/storage";
import { type SharedSong } from "@/lib/songUrl";
import { upsertSong, fetchSongStyle } from "@/lib/songDb";
import { DEFAULT_STYLE, backgroundStyle } from "@/lib/songStyle";
import type { SongStyle } from "@/lib/songStyle";

const genId = () => Math.random().toString(36).slice(2, 10);

const SECTION_LABELS = ["Verse", "Chorus", "Bridge", "Intro", "Outro", "Pre-Chorus", "Solo"];

interface SongEditorProps {
  initialSong?: SharedSong | null;
  isLoggedIn?: boolean;
}

export default function SongEditor({ initialSong, isLoggedIn = false }: SongEditorProps = {}) {
  const [title, setTitle] = useState(initialSong?.title ?? "Untitled Song");
  const [artist, setArtist] = useState(initialSong?.artist ?? "");
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [songId, setSongId] = useState(() => initialSong?.id ?? genId());
  const [saveFlash, setSaveFlash] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  // ── History (undo / redo) ────────────────────────────────────────────────────
  const MAX_HISTORY = 100;
  const historyStack = useRef<SongLine[][]>([]);
  const [historyPos, setHistoryPos] = useState(0);
  const textSnapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lines state — initializer also seeds the history stack
  const [lines, setLines] = useState<SongLine[]>(() => {
    const initial = initialSong?.lines ?? [{ id: genId(), type: "lyric", text: "", chords: [] }];
    historyStack.current = [initial];
    return initial;
  });
  const [songStyle, setSongStyle] = useState<SongStyle>(() => {
    // Seed backgroundImage from sessionStorage cache so it appears immediately
    const base = initialSong?.style ?? DEFAULT_STYLE;
    if (initialSong?.id && typeof sessionStorage !== "undefined") {
      const cached = sessionStorage.getItem(`bgImg:${initialSong.id}`);
      if (cached) return { ...base, backgroundImage: cached };
    }
    return base;
  });
  const [rightPanel, setRightPanel] = useState<"chords" | "style">("chords");
  // Always-current snapshot of song data — updated every render so effects can read
  // latest values without adding them as deps (avoids stale closures).
  const latestSongRef = useRef({ title, artist, lines, songId, songStyle });
  latestSongRef.current = { title, artist, lines, songId, songStyle };

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  // Track the last-saved backgroundImage so we only trigger an immediate save on actual changes
  const lastSavedBgImage = useRef<string | undefined>(
    // Initialise to whatever we seeded from sessionStorage/initialSong — no need to save that
    (() => {
      const base = initialSong?.style?.backgroundImage;
      if (initialSong?.id && typeof sessionStorage !== "undefined") {
        return sessionStorage.getItem(`bgImg:${initialSong.id}`) ?? base;
      }
      return base;
    })()
  );
  useEffect(() => setMounted(true), []);

  // ── Snapshot helpers ─────────────────────────────────────────────────────────

  // Push a snapshot immediately (structural changes: add/delete line/chord/section)
  const pushSnap = useCallback((next: SongLine[]) => {
    if (textSnapTimer.current) { clearTimeout(textSnapTimer.current); textSnapTimer.current = null; }
    const truncated = historyStack.current.slice(0, historyPos + 1);
    truncated.push(next);
    if (truncated.length > MAX_HISTORY) truncated.shift();
    historyStack.current = truncated;
    setHistoryPos(truncated.length - 1);
  // historyPos read from closure — intentional, see note below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPos]);

  // Push a snapshot after 600ms of inactivity (text typing / chord renaming)
  const pushSnapDebounced = useCallback((next: SongLine[]) => {
    if (textSnapTimer.current) clearTimeout(textSnapTimer.current);
    textSnapTimer.current = setTimeout(() => {
      const truncated = historyStack.current.slice(0, historyPos + 1);
      truncated.push(next);
      if (truncated.length > MAX_HISTORY) truncated.shift();
      historyStack.current = truncated;
      setHistoryPos(truncated.length - 1);
      textSnapTimer.current = null;
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPos]);

  const undo = useCallback(() => {
    setHistoryPos(pos => {
      if (pos <= 0) return pos;
      const next = pos - 1;
      setLines(historyStack.current[next]);
      return next;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryPos(pos => {
      if (pos >= historyStack.current.length - 1) return pos;
      const next = pos + 1;
      setLines(historyStack.current[next]);
      return next;
    });
  }, []);

  // Keyboard shortcuts: Ctrl+Z / Cmd+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node))
        setShowOverflow(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === "z" &&  e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === "y")                { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Restore backgroundImage from DB on mount — it's stripped from URL encoding.
  // Also cache it in sessionStorage so the next load is instant.
  useEffect(() => {
    const id = initialSong?.id;
    if (!id || !isLoggedIn) return;
    fetchSongStyle(id).then(fullStyle => {
      if (fullStyle?.backgroundImage) {
        sessionStorage.setItem(`bgImg:${id}`, fullStyle.backgroundImage);
        // Mark as already-saved BEFORE calling setSongStyle so the backgroundImage
        // change effect doesn't trigger an unnecessary re-save for a DB-restored image.
        lastSavedBgImage.current = fullStyle.backgroundImage;
        setSongStyle(prev => ({
          ...prev,
          backgroundImage: fullStyle.backgroundImage,
          overlayOpacity: fullStyle.overlayOpacity ?? prev.overlayOpacity,
        }));
      } else {
        sessionStorage.removeItem(`bgImg:${id}`);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When backgroundImage changes (user generates or removes it), save immediately —
  // don't wait for the 1s auto-save debounce so navigating away can't lose it.
  // Image is compressed to ~150 KB before reaching here, so body size is fine.
  useEffect(() => {
    if (!isLoggedIn) return;
    const newBg = songStyle.backgroundImage;
    if (newBg === lastSavedBgImage.current) return;
    lastSavedBgImage.current = newBg;
    // Keep sessionStorage in sync
    if (newBg) {
      sessionStorage.setItem(`bgImg:${latestSongRef.current.songId}`, newBg);
    } else {
      sessionStorage.removeItem(`bgImg:${latestSongRef.current.songId}`);
    }
    // Immediate full save — latestSongRef always has current values without stale closure risk
    const { title: t, artist: a, lines: l, songId: id, songStyle: s } = latestSongRef.current;
    upsertSong({ id, title: t, artist: a, lines: l, tags: [], style: s }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songStyle.backgroundImage, isLoggedIn]);

  // Require 8px movement before starting a row drag — prevents conflicts with chord dragging
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLines((prev) => {
      const oldIdx = prev.findIndex((l) => l.id === active.id);
      const newIdx = prev.findIndex((l) => l.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx);
      pushSnap(next);
      return next;
    });
  }, [pushSnap]);

  // ── Line operations ──────────────────────────────────────────────────────────

  const addLineAfter = useCallback((id: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const newLine: LyricLine = { id: genId(), type: "lyric", text: "", chords: [] };
      const next = [...prev.slice(0, idx + 1), newLine, ...prev.slice(idx + 1)];
      pushSnap(next);
      return next;
    });
  }, [pushSnap]);

  const deleteLine = useCallback((id: string) => {
    setLines((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((l) => l.id !== id);
      pushSnap(next);
      return next;
    });
  }, [pushSnap]);

  const updateLineText = useCallback((id: string, text: string) => {
    setLines((prev) => {
      const next = prev.map((l) => (l.id === id && l.type === "lyric" ? { ...l, text } : l));
      pushSnapDebounced(next);
      return next;
    });
  }, [pushSnapDebounced]);

  const addSectionAfter = useCallback((id: string, label: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const header: SectionHeader = { id: genId(), type: "section", label };
      const next = [...prev.slice(0, idx + 1), header, ...prev.slice(idx + 1)];
      pushSnap(next);
      return next;
    });
  }, [pushSnap]);

  const updateSection = useCallback((id: string, label: string) => {
    setLines((prev) => {
      const next = prev.map((l) => (l.id === id && l.type === "section" ? { ...l, label } : l));
      pushSnapDebounced(next);
      return next;
    });
  }, [pushSnapDebounced]);

  // ── Chord operations ─────────────────────────────────────────────────────────

  const addChord = useCallback((lineId: string, position: number, chord: string) => {
    setLines((prev) => {
      const next = prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: [...l.chords, { id: genId(), chord, position }] };
      });
      pushSnap(next);
      return next;
    });
  }, [pushSnap]);

  const updateChord = useCallback((lineId: string, chordId: string, chord: string) => {
    setLines((prev) => {
      const next = prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: l.chords.map((c) => (c.id === chordId ? { ...c, chord } : c)) };
      });
      pushSnapDebounced(next);
      return next;
    });
  }, [pushSnapDebounced]);

  const moveChord = useCallback((lineId: string, chordId: string, position: number) => {
    setLines((prev) => {
      const next = prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: l.chords.map((c) => (c.id === chordId ? { ...c, position } : c)) };
      });
      pushSnap(next);
      return next;
    });
  }, [pushSnap]);

  const deleteChord = useCallback((lineId: string, chordId: string) => {
    setLines((prev) => {
      const next = prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: l.chords.filter((c) => c.id !== chordId) };
      });
      pushSnap(next);
      return next;
    });
  }, [pushSnap]);

  // ── Save / Load ──────────────────────────────────────────────────────────────

  const [shareLoading, setShareLoading] = useState(false);

  const handleShare = useCallback(async () => {
    setShareLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, lines, style: songStyle }),
      });
      const { token } = await res.json();
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      setShareFlash(true);
      setTimeout(() => setShareFlash(false), 2000);
    } finally {
      setShareLoading(false);
    }
  }, [title, artist, lines, songStyle]);

  const persistSong = useCallback(async (opts?: { flash?: boolean }) => {
    if (isLoggedIn) {
      await upsertSong({ id: songId, title, artist, lines, tags: [], style: songStyle });
    } else {
      saveSong({ id: songId, title, artist, lines, updatedAt: new Date().toISOString() });
    }
    if (opts?.flash) {
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    }
  }, [isLoggedIn, songId, title, artist, lines, songStyle]);

  const handleSave = useCallback(() => {
    persistSong({ flash: true });
  }, [persistSong]);

  // Auto-save: debounce 1s after any content change, skip initial render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await persistSong();
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, artist, lines, songId, songStyle, persistSong]);

  const handleLoad = useCallback((song: StoredSong) => {
    setSongId(song.id);
    setTitle(song.title);
    setArtist(song.artist);
    setLines(song.lines);
    setSemitones(0);
  }, []);

  const handleNew = useCallback(() => {
    setSongId(genId());
    setTitle("Untitled Song");
    setArtist("");
    setLines([{ id: genId(), type: "lyric", text: "", chords: [] }]);
    setSemitones(0);
  }, []);

  // ── Find & Replace ───────────────────────────────────────────────────────────

  const handleFindReplace = (find: string, replace: string) => {
    const next = lines.map((line) => {
      if (line.type !== "lyric") return line;
      return {
        ...line,
        chords: line.chords.map((c) =>
          c.chord === find ? { ...c, chord: replace } : c
        ),
      };
    });
    pushSnap(next);
    setLines(next);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const displayLines = transposeSong(lines, semitones);

  if (viewMode) {
    return (
      <SongViewer
        title={title}
        artist={artist}
        lines={displayLines}
        onEdit={() => setViewMode(false)}
        songStyle={songStyle}
      />
    );
  }

  const lastLineId = lines[lines.length - 1].id;

  const renderLine = (line: SongLine) =>
    line.type === "lyric" ? (
      <LyricLineEditor
        line={line}
        activeChord={activeChord}
        onClearActiveChord={() => setActiveChord(null)}
        onUpdate={(text) => updateLineText(line.id, text)}
        onAddChord={(pos, chord) => addChord(line.id, pos, chord)}
        onUpdateChord={(cid, chord) => updateChord(line.id, cid, chord)}
        onMoveChord={(cid, pos) => moveChord(line.id, cid, pos)}
        onDeleteChord={(cid) => deleteChord(line.id, cid)}
        onAddLineAfter={() => addLineAfter(line.id)}
        onDelete={() => deleteLine(line.id)}
        songStyle={songStyle}
      />
    ) : (
      <SectionHeaderBlock
        section={line as SectionHeader}
        onUpdate={(label) => updateSection(line.id, label)}
        onDelete={() => deleteLine(line.id)}
        color={songStyle.chords.color ?? "#4f46e5"}
        align={songStyle.sectionAlign ?? "left"}
        showDivider={songStyle.sectionDivider ?? true}
      />
    );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-zinc-200 bg-white z-10 shrink-0">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          Chord<span className="text-indigo-600">SheetCreator</span>
        </Link>
        {isLoggedIn && (
          <>
            <div className="w-px h-5 bg-zinc-200" />
            <Link href="/songs" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              ← My Songs
            </Link>
          </>
        )}
        <div className="w-px h-5 bg-zinc-200" />
        <div className="flex flex-col min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="text-base font-semibold text-zinc-900 bg-transparent outline-none leading-tight"
            placeholder="Song title"
          />
          <div className="flex items-center gap-2">
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="text-xs text-zinc-400 bg-transparent outline-none leading-tight"
              placeholder="Artist"
            />
            <span
              className={`text-xs text-zinc-300 transition-opacity duration-500 ${
                autoSaved ? "opacity-100" : "opacity-0"
              }`}
            >
              Saved
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {/* Undo / Redo */}
          <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
            <button
              onClick={undo}
              disabled={historyPos <= 0}
              className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8Z"/>
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={historyPos >= historyStack.current.length - 1}
              className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-zinc-200"
              title="Redo (Ctrl+Y)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6Z"/>
              </svg>
            </button>
          </div>

          <div className="w-px h-5 bg-zinc-200" />

          {/* Transpose: − key + */}
          <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setSemitones((s) => s - 1)}
              className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors text-base font-medium"
              title="Transpose down 1 semitone"
            >−</button>
            <button
              onClick={() => setSemitones(0)}
              className={`text-xs px-2 min-w-[3.5rem] text-center border-x border-zinc-200 h-7 transition-colors ${
                semitones === 0
                  ? "text-zinc-400"
                  : "text-indigo-600 font-semibold hover:bg-indigo-50"
              }`}
              title="Reset to original key"
            >
              {semitoneLabel(semitones)}
            </button>
            <button
              onClick={() => setSemitones((s) => s + 1)}
              className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors text-base font-medium"
              title="Transpose up 1 semitone"
            >+</button>
          </div>

          <div className="w-px h-5 bg-zinc-200" />

          {/* Overflow menu — Import, Replace, View, Print, New */}
          <div className="relative" ref={overflowRef}>
            <button
              onClick={() => setShowOverflow((v) => !v)}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors text-lg leading-none"
              title="More options"
            >•••</button>
            {showOverflow && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-zinc-200 py-1.5 z-50">
                <button onClick={() => { setShowImport(true); setShowOverflow(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400"><path d="M19 9h-4V3H9v6H5l7 7 7-7ZM5 18v2h14v-2H5Z"/></svg>
                  Import
                </button>
                <button onClick={() => { setShowFindReplace(true); setShowOverflow(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"/></svg>
                  Find &amp; Replace
                </button>
                <button onClick={() => { setViewMode(true); setShowOverflow(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>
                  View
                </button>
                <button onClick={() => { window.print(); setShowOverflow(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3Zm-3 11H8v-5h8v5Zm3-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-1-9H6v4h12V3Z"/></svg>
                  Print
                </button>
                <div className="border-t border-zinc-100 my-1" />
                <button onClick={() => { handleNew(); setShowOverflow(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 7V3.5L18.5 9H13Zm-2 8v-3H9v-2h2v-2h2v2h2v2h-2v3h-2Z"/></svg>
                  New Song
                </button>
              </div>
            )}
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              shareFlash
                ? "text-green-600 bg-green-50"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
            title="Copy shareable link"
          >
            {shareFlash ? "Copied!" : shareLoading ? "…" : "Share"}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              saveFlash
                ? "bg-green-500 text-white"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {saveFlash ? "Saved!" : "Save"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto" style={backgroundStyle(songStyle)}>
          <div className="max-w-3xl mx-auto px-12 py-10 space-y-0">
            {/* Title & artist preview — styled same as viewer */}
            <div className="mb-10 text-center">
              <div
                style={{
                  fontFamily: songStyle.title.fontFamily,
                  fontSize: songStyle.title.fontSize,
                  fontWeight: songStyle.title.bold !== false ? "bold" : "normal",
                  fontStyle: songStyle.title.italic ? "italic" : "normal",
                  color: songStyle.title.color ?? "#18181b",
                  lineHeight: 1.2,
                }}
              >
                {title || <span style={{ opacity: 0.3 }}>Untitled Song</span>}
              </div>
              {artist && (
                <div
                  style={{
                    fontFamily: songStyle.artist?.fontFamily ?? songStyle.lyrics.fontFamily,
                    fontSize: songStyle.artist?.fontSize ?? 13,
                    fontWeight: songStyle.artist?.bold ? "bold" : "normal",
                    fontStyle: songStyle.artist?.italic ? "italic" : "normal",
                    color: songStyle.artist?.color ?? "#71717a",
                    marginTop: 4,
                  }}
                >
                  {artist}
                </div>
              )}
            </div>
            {/* Empty state — shown when there is no content yet */}
            {lines.length === 1 &&
              lines[0].type === "lyric" &&
              (lines[0] as LyricLine).text === "" &&
              (lines[0] as LyricLine).chords.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                  <div className="text-4xl">🎵</div>
                  <div>
                    <p className="text-base font-semibold text-zinc-700">Start your chord sheet</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Import from a chord site or image, or start typing below.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowImport(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-6 py-3 rounded-xl shadow-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 8l-3-3m3 3l3-3" />
                    </svg>
                    Import chord sheet
                  </button>
                  <p className="text-xs text-zinc-300">Paste text · Upload image · Paste from clipboard</p>
                </div>
              )}

            {mounted ? (
              <DndContext
                id="song-editor-dnd"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={lines.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayLines.map((line) => (
                    <SortableLine key={line.id} id={line.id}>
                      {renderLine(line)}
                    </SortableLine>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              displayLines.map((line) => (
                <div key={line.id} className="pl-4">
                  {renderLine(line)}
                </div>
              ))
            )}

            {/* Bottom controls */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-6">
              <button
                onClick={() => addLineAfter(lastLineId)}
                className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                + Line
              </button>
              {SECTION_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => addSectionAfter(lastLineId, label)}
                  className="text-sm text-zinc-400 hover:text-indigo-600 transition-colors"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel with tabs */}
        <div className="w-52 shrink-0 border-l border-zinc-200 flex flex-col overflow-hidden">
          <div className="flex border-b border-zinc-200 shrink-0 bg-zinc-50">
            <button
              onClick={() => setRightPanel("chords")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                rightPanel === "chords" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Chords
            </button>
            <button
              onClick={() => setRightPanel("style")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                rightPanel === "style" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Style
            </button>
          </div>
          {rightPanel === "chords" ? (
            <ChordPalette
              activeChord={activeChord}
              onSelectChord={setActiveChord}
              asideClassName="flex flex-col overflow-hidden flex-1 bg-zinc-50"
            />
          ) : (
            <StylePanel
              style={songStyle}
              onChange={setSongStyle}
              songTitle={title}
              songArtist={artist}
              lyricsText={lines
                .filter((l) => l.type === "lyric")
                .map((l) => (l.type === "lyric" ? l.text : ""))
                .filter(Boolean)
                .join("\n")}
            />
          )}
        </div>
      </div>

      {/* Print view — invisible on screen, rendered by @media print */}
      <PrintView title={title} artist={artist} lines={displayLines} songStyle={songStyle} watermark />

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onImport={(imported, meta) => {
            setLines(imported);
            if (meta?.title && meta.title !== "Unknown") setTitle(meta.title);
            if (meta?.artist) setArtist(meta.artist);
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Find & Replace modal */}
      {showFindReplace && (
        <FindReplaceModal
          lines={lines}
          onReplace={handleFindReplace}
          onClose={() => setShowFindReplace(false)}
        />
      )}

    </div>
  );
}
