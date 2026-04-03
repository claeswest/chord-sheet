"use client";

import { useState, useEffect, useRef } from "react";
import type { SongLine } from "@/types/song";
import { parseChordSheet } from "@/lib/parseChordSheet";

interface ImportMeta {
  title?: string;
  artist?: string;
}

interface Props {
  onImport: (lines: SongLine[], meta?: ImportMeta) => void;
  onClose: () => void;
}

const EXAMPLE = `Verse 1
[Am]Hello [G]darkness, my [C]old friend
[Em]I've come to [Am]talk with [G]you again

Chorus
[C]The [G]sound of [Am]silence`;

export default function ImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<SongLine[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [meta, setMeta] = useState<ImportMeta>({});
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAiClean = async () => {
    if (!text.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAiError(body.error ?? "AI request failed");
        return;
      }
      const data = await res.json();
      setText(data.text ?? "");
      setMeta({
        title: data.title && data.title !== "Unknown" ? data.title : undefined,
        artist: data.artist || undefined,
      });
    } catch {
      setAiError("Network error — check your connection");
    } finally {
      setAiLoading(false);
    }
  };

  const handleImport = () => {
    if (preview.length > 0) {
      onImport(preview, meta);
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
              Paste text from any chord site — or let AI clean and format it for you.
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setText(EXAMPLE); setMeta({}); }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  Load example
                </button>
                <button
                  onClick={handleAiClean}
                  disabled={!text.trim() || aiLoading}
                  className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  {aiLoading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Cleaning…
                    </>
                  ) : (
                    <>✦ AI Clean</>
                  )}
                </button>
              </div>
            </div>

            {aiError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded px-3 py-2">
                {aiError}
              </p>
            )}

            {meta.title && (
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded px-3 py-2 flex gap-3">
                <span><span className="font-medium">Title:</span> {meta.title}</span>
                {meta.artist && <span><span className="font-medium">Artist:</span> {meta.artist}</span>}
                <span className="text-violet-400 ml-auto">Will be applied on import</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setMeta({}); }}
              placeholder={`Paste chord sheet here…\n\nTip: paste raw text from any chord website,\nthen click ✦ AI Clean to format it automatically.`}
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
