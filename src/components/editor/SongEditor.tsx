"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { SongLine, LyricLine, SectionHeader } from "@/types/song";
import LyricLineEditor from "./LyricLineEditor";
import SectionHeaderBlock from "./SectionHeaderBlock";
import ChordPalette from "./ChordPalette";
import SongViewer from "./SongViewer";

const genId = () => Math.random().toString(36).slice(2, 10);

const SECTION_LABELS = ["Verse", "Chorus", "Bridge", "Intro", "Outro", "Pre-Chorus", "Solo"];

export default function SongEditor() {
  const [title, setTitle] = useState("Untitled Song");
  const [artist, setArtist] = useState("");
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [lines, setLines] = useState<SongLine[]>(() => [
    { id: genId(), type: "lyric", text: "", chords: [] },
  ]);

  // ── Line operations ──────────────────────────────────────────────────────────

  const addLineAfter = useCallback((id: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const newLine: LyricLine = { id: genId(), type: "lyric", text: "", chords: [] };
      return [...prev.slice(0, idx + 1), newLine, ...prev.slice(idx + 1)];
    });
  }, []);

  const deleteLine = useCallback((id: string) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)));
  }, []);

  const updateLineText = useCallback((id: string, text: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id && l.type === "lyric" ? { ...l, text } : l))
    );
  }, []);

  const addSectionAfter = useCallback((id: string, label: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const header: SectionHeader = { id: genId(), type: "section", label };
      return [...prev.slice(0, idx + 1), header, ...prev.slice(idx + 1)];
    });
  }, []);

  const updateSection = useCallback((id: string, label: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id && l.type === "section" ? { ...l, label } : l))
    );
  }, []);

  // ── Chord operations ─────────────────────────────────────────────────────────

  const addChord = useCallback((lineId: string, position: number, chord: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: [...l.chords, { id: genId(), chord, position }] };
      })
    );
  }, []);

  const updateChord = useCallback((lineId: string, chordId: string, chord: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: l.chords.map((c) => (c.id === chordId ? { ...c, chord } : c)) };
      })
    );
  }, []);

  const moveChord = useCallback((lineId: string, chordId: string, position: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: l.chords.map((c) => (c.id === chordId ? { ...c, position } : c)) };
      })
    );
  }, []);

  const deleteChord = useCallback((lineId: string, chordId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId || l.type !== "lyric") return l;
        return { ...l, chords: l.chords.filter((c) => c.id !== chordId) };
      })
    );
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (viewMode) {
    return (
      <SongViewer
        title={title}
        artist={artist}
        lines={lines}
        onEdit={() => setViewMode(false)}
      />
    );
  }

  const lastLineId = lines[lines.length - 1].id;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-zinc-200 bg-white z-10 shrink-0">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900 mr-2">
          Chord<span className="text-indigo-600">Sheet</span>
        </Link>
        <div className="w-px h-5 bg-zinc-200" />
        <div className="flex flex-col min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-semibold text-zinc-900 bg-transparent outline-none leading-tight"
            placeholder="Song title"
          />
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="text-xs text-zinc-400 bg-transparent outline-none leading-tight"
            placeholder="Artist"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setViewMode(true)}
            className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            View
          </button>
          <button className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Save
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-12 py-10 space-y-0">
            {lines.map((line) =>
              line.type === "lyric" ? (
                <LyricLineEditor
                  key={line.id}
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
                />
              ) : (
                <SectionHeaderBlock
                  key={line.id}
                  section={line}
                  onUpdate={(label) => updateSection(line.id, label)}
                  onDelete={() => deleteLine(line.id)}
                />
              )
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

        {/* Chord palette */}
        <ChordPalette activeChord={activeChord} onSelectChord={setActiveChord} />
      </div>
    </div>
  );
}
