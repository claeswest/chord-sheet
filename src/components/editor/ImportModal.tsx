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
  const [tab, setTab] = useState<"text" | "image">("text");

  // Text tab state
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<SongLine[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [meta, setMeta] = useState<ImportMeta>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Image tab state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (tab === "text") textareaRef.current?.focus();
  }, [tab]);

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

  // ── Text tab: AI Clean ──────────────────────────────────────────────────
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

  // ── Image tab: load file ────────────────────────────────────────────────
  const loadImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setOcrError("Please upload an image file (JPG, PNG, WEBP, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setOcrError("");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };

  // ── Image tab: OCR ──────────────────────────────────────────────────────
  const handleOcrRead = async () => {
    if (!imageSrc) return;
    setOcrLoading(true);
    setOcrError("");
    try {
      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setOcrError(body.error ?? "OCR request failed");
        return;
      }
      const data = await res.json();
      // Populate text tab and switch to it
      setText(data.text ?? "");
      setMeta({
        title: data.title && data.title !== "Unknown" ? data.title : undefined,
        artist: data.artist || undefined,
      });
      setTab("text");
    } catch {
      setOcrError("Network error — check your connection");
    } finally {
      setOcrLoading(false);
    }
  };

  // ── Import ──────────────────────────────────────────────────────────────
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
              Paste text from any chord site, or upload a photo of a chord sheet.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-6">
          <button
            onClick={() => setTab("text")}
            className={`text-sm font-medium px-1 py-3 mr-6 border-b-2 transition-colors ${
              tab === "text"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            Paste text
          </button>
          <button
            onClick={() => setTab("image")}
            className={`text-sm font-medium px-1 py-3 border-b-2 transition-colors ${
              tab === "image"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            📷 Upload image
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden divide-x divide-zinc-100">
          {/* ── Left pane ── */}
          <div className="flex flex-col flex-1 p-4 gap-3">

            {tab === "text" ? (
              <>
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
              </>
            ) : (
              <>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Upload image
                </label>

                {ocrError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded px-3 py-2">
                    {ocrError}
                  </p>
                )}

                {/* Drop zone */}
                <div
                  onClick={() => !imageSrc && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors min-h-[280px] ${
                    dragOver
                      ? "border-indigo-400 bg-indigo-50"
                      : imageSrc
                      ? "border-zinc-200 bg-zinc-50 cursor-default"
                      : "border-zinc-200 bg-zinc-50 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
                  }`}
                >
                  {imageSrc ? (
                    <div className="flex flex-col items-center gap-3 w-full h-full p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc}
                        alt="Chord sheet preview"
                        className="max-h-52 max-w-full object-contain rounded-lg shadow-sm"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageSrc(null);
                          setOcrError("");
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center px-6">
                      <span className="text-3xl">📷</span>
                      <p className="text-sm font-medium text-zinc-600">
                        Click to upload or drag &amp; drop
                      </p>
                      <p className="text-xs text-zinc-400">
                        JPG, PNG, WEBP — photo or scan of any chord sheet
                      </p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  onClick={handleOcrRead}
                  disabled={!imageSrc || ocrLoading}
                  className="flex items-center justify-center gap-2 text-sm bg-violet-600 text-white px-4 py-2.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  {ocrLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Reading with AI…
                    </>
                  ) : (
                    <>✦ Read with AI</>
                  )}
                </button>
              </>
            )}
          </div>

          {/* ── Preview pane ── */}
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
                <p className="text-zinc-300 text-xs">
                  {tab === "image" && !text
                    ? "Upload an image and click ✦ Read with AI — parsed output will appear here."
                    : "Parsed output will appear here…"}
                </p>
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
            Supports chord-over-lyric, inline [Am] brackets, section headers, and image upload.
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
