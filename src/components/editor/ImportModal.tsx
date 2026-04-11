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
  defaultTab?: "search" | "text" | "image";
}

const EXAMPLE = `Verse 1
[Am]Hello [G]darkness, my [C]old friend
[Em]I've come to [Am]talk with [G]you again

Chorus
[C]The [G]sound of [Am]silence`;

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function ChordPreview({ preview }: { preview: SongLine[] }) {
  // Strip all empty lines — section headers already provide spacing via pt-6
  const filtered = preview.filter((line) =>
    line.type === "section" || line.text.trim() || line.chords.length > 0
  );

  return (
    <div className="space-y-0">
      {filtered.map((line) => {
        if (line.type === "section") {
          return (
            <div key={line.id} className="pt-6 pb-1 first:pt-2">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                {line.label}
              </span>
            </div>
          );
        }
        if (!line.text.trim() && line.chords.length === 0) return null;
        const hasChords = line.chords.length > 0;
        const hasText = line.text.trim().length > 0;
        return (
          <div key={line.id} className="relative mb-0.5" style={{ paddingTop: hasChords ? "1.4em" : 0 }}>
            {hasChords && (
              <div className="absolute top-0 left-0 text-xs font-semibold text-indigo-400 tracking-wide whitespace-nowrap">
                {line.chords.map((c) => c.chord).join("  ")}
              </div>
            )}
            {hasText && (
              <div className="text-sm text-zinc-700 leading-snug whitespace-pre-wrap">
                {line.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ImportModal({ onImport, onClose, defaultTab = "search" }: Props) {
  const [tab, setTab] = useState<"search" | "text" | "image">(defaultTab);

  const [text, setText] = useState("");
  const [preview, setPreview] = useState<SongLine[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [meta, setMeta] = useState<ImportMeta>({});
  const [cleaned, setCleaned] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingAutoClean = useRef(false);

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (tab === "text" && !cleaned) textareaRef.current?.focus();
    if (tab === "search") searchInputRef.current?.focus();
  }, [tab, cleaned]);

  useEffect(() => {
    if (text.trim()) {
      setPreview(parseChordSheet(text));
      if (pendingAutoClean.current) {
        pendingAutoClean.current = false;
        handleAiClean(text);
      }
    } else {
      setPreview([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (tab !== "image") return;
    const handler = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) loadImageFile(file);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleAiClean = async (textOverride?: string) => {
    const input = textOverride ?? text;
    if (!input.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAiError(body.error ?? "AI request failed");
        return;
      }
      const data = await res.json();
      setText(data.text ?? "");
      setMeta(prev => ({
        title: (data.title && data.title !== "Unknown") ? data.title : prev.title,
        artist: data.artist || prev.artist,
      }));
      setCleaned(true);
    } catch {
      setAiError("Network error — check your connection");
    } finally {
      setAiLoading(false);
    }
  };

  const loadImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setOcrError("Please upload an image file (JPG, PNG, WEBP, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => { setImageSrc(e.target?.result as string); setOcrError(""); };
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
      pendingAutoClean.current = true;
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSearchError(body.error ?? "Search failed");
        return;
      }
      const data = await res.json();
      pendingAutoClean.current = true;
      setText(data.text ?? "");
      setMeta({
        title: data.title && data.title !== "Unknown" ? data.title : undefined,
        artist: data.artist || undefined,
      });
      setTab("text");
    } catch {
      setSearchError("Network error — check your connection");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImport = () => {
    if (preview.length > 0) { onImport(preview, meta); onClose(); }
  };

  const showReview = cleaned && !aiLoading;
  const searchOnly = defaultTab === "search";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header — dark navy, matches songs page top bar */}
        <div className="flex items-center justify-between px-6 py-4" style={{ background: "#302b63" }}>
          {!showReview ? (
            <div>
              <h2 className="text-base font-semibold text-white">
                {searchOnly ? "Find a song" : "Import from web or photo"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                {searchOnly
                  ? "Type artist and song below — AI does the rest."
                  : "Paste chords from a website or upload a photo."}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold shrink-0">✓</span>
              <span className="text-sm font-medium text-white/80">Chords found</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors text-lg leading-none px-1 ml-auto"
          >
            ✕
          </button>
        </div>

        {/* Tabs — only for import mode, no AI Search tab here */}
        {!showReview && !searchOnly && (
          <div className="flex border-b border-zinc-100 px-6 bg-white">
            {(["text", "image"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-sm font-medium px-1 py-3 mr-6 border-b-2 transition-colors ${
                  tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {t === "text"  && "📋 Paste text"}
                {t === "image" && "📷 Upload image"}
              </button>
            ))}
          </div>
        )}

        {/* ── Review view ── */}
        {showReview ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Song identity */}
            <div className="px-6 py-3 border-b border-zinc-100">
              <div className="text-xl font-semibold text-zinc-900">
                {meta.title ?? <span className="italic text-zinc-400">Untitled</span>}
              </div>
              {meta.artist && <div className="text-sm text-zinc-400 mt-0.5">{meta.artist}</div>}
            </div>
            {/* Chord preview */}
            <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
              <ChordPreview preview={preview} />
            </div>
          </div>

        ) : (
          /* ── Input views ── */
          <div className="flex flex-col flex-1 p-5 gap-4 bg-white">

            {tab === "search" && (
              <div className="flex-1 flex flex-col justify-center gap-4 py-4">
                {searchError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{searchError}</p>
                )}
                <div className="flex gap-2">
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSearchError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="e.g. Oasis Wonderwall"
                    spellCheck={false}
                    className="flex-1 border border-zinc-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!query.trim() || searchLoading}
                    className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {searchLoading ? <><Spinner size={4} /> Searching…</> : <>✦ Search</>}
                  </button>
                </div>
                <p className="text-xs text-zinc-400">Results may need a tweak — AI isn&apos;t always perfect.</p>
              </div>
            )}

            {tab === "text" && (
              <>
                {aiLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <style>{`@keyframes wave { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(30deg)} }`}</style>
                    <span style={{ fontSize: 40, display: "inline-block", transformOrigin: "bottom right", animation: "wave 1.4s ease-in-out infinite" }}>🪄</span>
                    <p className="text-sm font-medium text-zinc-600">AI is cleaning up the chord sheet…</p>
                    <p className="text-xs text-zinc-400">This usually takes a few seconds</p>
                  </div>
                ) : (
                  <>
                    {aiError && (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{aiError}</p>
                    )}
                    <div className="relative flex-1 min-h-[220px]">
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => { setText(e.target.value); setMeta({}); setCleaned(false); }}
                        onPaste={() => { pendingAutoClean.current = true; }}
                        spellCheck={false}
                        className="absolute inset-0 w-full h-full text-sm font-mono text-zinc-700 bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 resize-none leading-relaxed"
                      />
                      {!text && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                          <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-sm text-zinc-300 text-center px-6">
                            Paste chord sheet here —<br />AI will clean it automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {tab === "image" && (
              <>
                {ocrError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{ocrError}</p>
                )}
                <div
                  onClick={() => !imageSrc && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors min-h-[240px] ${
                    dragOver ? "border-indigo-400 bg-indigo-50"
                    : imageSrc ? "border-zinc-300 bg-zinc-50 cursor-default"
                    : "border-zinc-300 bg-zinc-50 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
                  }`}
                >
                  {imageSrc ? (
                    <div className="flex flex-col items-center gap-3 w-full h-full p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageSrc} alt="Chord sheet" className="max-h-64 max-w-full object-contain rounded-lg shadow-sm" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setImageSrc(null); setOcrError(""); }}
                        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center px-6">
                      <svg className="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.75 1.75 0 0022.75 18.5V5.75A1.75 1.75 0 0021 4H3A1.75 1.75 0 001.25 5.75v12.75A1.75 1.75 0 003 20.25zM8.25 9.75a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-zinc-600">Click to upload, drag &amp; drop, or paste</p>
                        <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WEBP · or paste with Ctrl+V / ⌘V</p>
                      </div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={handleOcrRead}
                  disabled={!imageSrc || ocrLoading}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {ocrLoading ? <><Spinner size={4} /> Scanning with AI…</> : <>🪄 Scan with AI</>}
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer — only shown when there is something to import */}
        {preview.length > 0 && !aiLoading && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-100 bg-white">
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg transition-colors"
            >
              <span className="text-base leading-none">♪</span> Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
