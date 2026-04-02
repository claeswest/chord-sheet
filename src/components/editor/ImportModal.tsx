"use client";

import { useState, useEffect, useRef } from "react";
import type { SongLine } from "@/types/song";
import { parseChordSheet } from "@/lib/parseChordSheet";

interface Props {
  onImport: (lines: SongLine[]) => void;
  onClose: () => void;
}

const EXAMPLE = `Intro

Am          G       C
Hello darkness, my old friend,
Em    Am            G
I've come to talk with you again.

Chorus
    C          G        Am
The sound of silence.`;

export default function ImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<SongLine[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (text.trim()) {
      setPreview(parseChordSheet(text));
    } else {
      setPreview([]);
    }
  }, [text]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleImport = () => {
    if (preview.length > 0) {
      onImport(preview);
      onClose();
    }
  };

  const lyricCount = preview.filter((l) => l.type === "lyric").length;
  const chordCount = preview
    .filter((l) => l.type === "lyric")
    .reduce((sum, l) => sum + (l.type === "lyric" ? l.chords.length : 0), 0);
  const sectionCount = preview.filter((l) => l.type === "section").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Import chord sheet</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Paste any chord-over-lyric text and we&apos;ll parse it automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden divide-x divide-zinc-100">
          {/* Input pane */}
          <div className="flex flex-col flex-1 p-4 gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Paste text
              </label>
              <button
                onClick={() => setText(EXAMPLE)}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                Load example
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste chord sheet here…\n\nExample:\n  Am      G\n  Hello world`}
              spellCheck={false}
              className="flex-1 text-sm font-mono text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 resize-none leading-relaxed placeholder:text-zinc-300 min-h-[280px]"
            />
          </div>

          {/* Preview pane */}
          <div className="flex flex-col flex-1 p-4 gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Preview
              </label>
              {preview.length > 0 && (
                <span className="text-xs text-zinc-400">
                  {lyricCount} lines · {chordCount} chords · {sectionCount} sections
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 font-mono text-sm">
              {preview.length === 0 ? (
                <p className="text-zinc-300 text-xs">Parsed output will appear here…</p>
              ) : (
                <div className="space-y-0">
                  {preview.map((line) => {
                    if (line.type === "section") {
                      return (
                        <div key={line.id} className="pt-4 pb-0.5">
                          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                            {line.label}
                          </span>
                        </div>
                      );
                    }
                    const hasChords = line.chords.length > 0;
                    return (
                      <div key={line.id} className="relative" style={{ paddingTop: hasChords ? "1.2em" : 0 }}>
                        {hasChords && (
                          <div className="absolute top-0 left-0 text-xs font-bold text-indigo-500 whitespace-nowrap">
                            {line.chords.map((c) => c.chord).join("  ")}
                          </div>
                        )}
                        <div className="text-xs text-zinc-700 leading-relaxed whitespace-pre">
                          {line.text || <span className="text-zinc-300">‹empty line›</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 bg-zinc-50 rounded-b-2xl">
          <p className="text-xs text-zinc-400">
            Supports chord-over-lyric, inline [Am] brackets, and section headers.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={preview.length === 0}
              className="text-sm bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Import {preview.length > 0 ? `${lyricCount + sectionCount} lines` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
