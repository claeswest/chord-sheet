"use client";

import { useState, useEffect, useRef } from "react";
import type { LyricLine, SongLine } from "@/types/song";
import { parseChordSheet } from "@/lib/parseChordSheet";
import { trackAiSearch, trackImportSuccess, activityBeacon, anonHeader } from "@/lib/analytics";
import WorkingNotes from "@/components/ui/WorkingNotes";

interface ImportMeta {
  title?: string;
  artist?: string;
}

interface Props {
  onImport: (lines: SongLine[], meta?: ImportMeta, source?: "search" | "text" | "photo") => void;
  onClose: (didImport?: boolean) => void;
  defaultTab?: "search" | "text" | "image";
  /** A title already typed on the start screen: it is searched for at once. */
  initialQuery?: string;
}

const EXAMPLE = `Verse 1
[Am]Hello [G]darkness, my [C]old friend
[Em]I've come to [Am]talk with [G]you again

Chorus
[C]The [G]sound of [Am]silence`;

// True when the pasted content is essentially just a link (a song URL from
// Suno/YouTube/Spotify, etc.) rather than lyrics. We can't read a page — the
// user needs to paste the actual words — so we nudge instead of importing junk.
function isJustUrl(s: string): boolean {
  const lines = s.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0 || lines.length > 2) return false;
  const urlRe = /^(https?:\/\/|www\.)\S+$/i;
  return lines.every((l) => urlRe.test(l));
}

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/**
 * What the dialog shows while the AI works: finding the song, then tidying it.
 * The animation itself is shared with the library — see ui/WorkingNotes.
 */
function Working({ title, detail }: { title: string; detail: string }) {
  return <WorkingNotes title={title} detail={detail} className="flex-1 py-14" />;
}

/**
 * One line of the preview. The words are cut where the chords fall, and each
 * chord sits on top of its piece, so it stays over its syllable in a typeface
 * where letters differ in width. (Chords used to be listed at the start of the
 * line, which showed which chords, but not where.)
 */
function PreviewLine({ line }: { line: LyricLine }) {
  const lyric = "text-[15px] leading-snug text-ink";
  if (line.chords.length === 0) return <div className={`${lyric} whitespace-pre-wrap`}>{line.text}</div>;

  const chords = [...line.chords].sort((a, b) => a.position - b.position);
  const cut = (i: number) => i < chords.length
    ? Math.min(Math.max(0, Math.round(chords[i].position)), line.text.length)
    : line.text.length;
  const pieces = [
    ...(cut(0) > 0 ? [{ chord: "", text: line.text.slice(0, cut(0)) }] : []),
    ...chords.map((c, i) => ({ chord: c.chord, text: line.text.slice(cut(i), cut(i + 1)) })),
  ];
  return (
    <div className="flex flex-wrap items-end">
      {pieces.map((piece, i) => (
        <span key={i} className="inline-flex flex-col">
          {/* The space after a chord keeps two close chords from running together. */}
          <span className="h-[1.35em] pr-2 text-[13px] font-semibold text-chord whitespace-nowrap">{piece.chord}</span>
          {line.text && <span className={`${lyric} whitespace-pre`}>{piece.text || "\u00A0"}</span>}
        </span>
      ))}
    </div>
  );
}

function ChordPreview({ preview }: { preview: SongLine[] }) {
  // Strip all empty lines — section headers already provide the spacing
  const filtered = preview.filter((line) =>
    line.type === "section" || line.text.trim() || line.chords.length > 0
  );

  return (
    <div>
      {filtered.map((line) =>
        line.type === "section" ? (
          <div key={line.id} className="pt-6 pb-1.5 first:pt-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-chord">{line.label}</span>
          </div>
        ) : (
          <div key={line.id} className="mb-1"><PreviewLine line={line} /></div>
        )
      )}
    </div>
  );
}

export default function ImportModal({ onImport, onClose, defaultTab = "search", initialQuery = "" }: Props) {
  const [tab, setTab] = useState<"search" | "text" | "image">(defaultTab);

  const [text, setText] = useState("");
  const [preview, setPreview] = useState<SongLine[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [meta, setMeta] = useState<ImportMeta>({});
  const [cleaned, setCleaned] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingAutoClean = useRef(false);
  // Funnel analytics: remember how the imported content originated.
  const importSource = useRef<"search" | "text" | "photo">(
    defaultTab === "search" ? "search" : "text"
  );

  const [query, setQuery] = useState(initialQuery);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Once only: in development React runs a new effect twice, and a search costs money.
  const searchedOnArrival = useRef(false);
  useEffect(() => {
    if (!initialQuery.trim() || searchedOnArrival.current) return;
    searchedOnArrival.current = true;
    handleSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "text" && !cleaned) textareaRef.current?.focus();
    if (tab === "search") searchInputRef.current?.focus();
    // searchLoading too: the field is away while a search runs, and typing
    // should resume in it when a search fails and it comes back.
  }, [tab, cleaned, searchLoading]);

  useEffect(() => {
    if (text.trim()) {
      setPreview(parseChordSheet(text));
      if (pendingAutoClean.current) {
        pendingAutoClean.current = false;
        // Don't waste an AI-clean call on a bare link — nudge the user instead.
        if (!isJustUrl(text)) handleAiClean(text);
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
        headers: { "Content-Type": "application/json", ...anonHeader() },
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
    importSource.current = "photo";
    setOcrLoading(true);
    setOcrError("");
    try {
      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...anonHeader() },
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
    importSource.current = "search";
    setSearchLoading(true);
    setSearchError("");
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...anonHeader() },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404 || data.notFound) {
          trackAiSearch("notfound");
          setSearchError("Song not found — try a different title or artist name");
        } else if (res.status === 429 || data.error === "rate_limited") {
          trackAiSearch("error");
          setSearchError("The AI is busy right now — please try again in a moment");
        } else {
          trackAiSearch("error");
          setSearchError("Something went wrong — please try again");
        }
        return;
      }
      trackAiSearch("success");
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
    if (preview.length > 0) {
      trackImportSuccess(importSource.current);
      activityBeacon("song_imported", { source: importSource.current, title: meta.title });
      onImport(preview, meta, importSource.current);
      onClose(true);
    }
  };

  const showReview = cleaned && !aiLoading;
  const searchOnly = defaultTab === "search";

  // Out of the result without leaving the dialog: the wrong song, or text that
  // needs another look. Closing instead would drop a new song back in the library.
  const backToInput = () => {
    setCleaned(false);
    if (!searchOnly) return;
    setText("");
    setMeta({});
    setTab("search");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28, 25, 23, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl border border-rule shadow-2xl shadow-black/40 w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-paper-deep border-b border-rule">
          {!showReview ? (
            <div>
              <h2 className="font-display font-medium text-2xl leading-tight tracking-[-0.01em] text-ink">
                {searchOnly ? "Find a song" : "Import from web or photo"}
              </h2>
              <p className="text-[13px] mt-1 text-stone-600">
                {searchOnly
                  ? "Type the artist and song — AI does the rest."
                  : "Paste chords from a website or upload a photo."}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-chord text-white text-[11px] font-bold shrink-0">✓</span>
              <span className="text-sm font-semibold text-ink">Chords found</span>
            </div>
          )}
          <button
            onClick={() => onClose()}
            aria-label="Close"
            className="text-stone-500 hover:text-ink transition-colors text-lg leading-none px-1 ml-auto"
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
                  tab === t ? "border-ink text-ink" : "border-transparent text-stone-500 hover:text-ink"
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
            {/* The chart on paper: its title, then the song. */}
            <div className="flex-1 overflow-y-auto bg-paper px-7 sm:px-9 pt-6 pb-8">
              <div className="font-display font-medium text-[1.75rem] leading-tight tracking-[-0.01em] text-ink">
                {meta.title ?? <span className="italic text-stone-500">Untitled</span>}
              </div>
              {meta.artist && <div className="text-sm text-stone-600 mt-1">{meta.artist}</div>}
              <div className="mt-5 pt-5 border-t border-rule">
                <ChordPreview preview={preview} />
              </div>
            </div>
          </div>

        ) : (
          /* ── Input views ── */
          <div className="flex flex-col flex-1 p-5 gap-4 bg-white">

            {tab === "search" && searchLoading && (
              <Working title="Finding the chords…" detail={`“${query.trim()}”`} />
            )}

            {tab === "search" && !searchLoading && (
              <div className="flex-1 flex flex-col justify-center gap-3 py-4">
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
                    aria-label="Artist and song"
                    className="flex-1 min-w-0 border border-rule rounded-lg px-4 py-3 text-base text-ink outline-none placeholder:text-stone-400 focus:border-chord focus:ring-2 focus:ring-chord/15 transition-shadow"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!query.trim() || searchLoading}
                    className="flex items-center gap-1.5 text-sm font-medium bg-ink hover:bg-stone-700 text-white px-5 py-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Search
                  </button>
                </div>
                <p className="text-[13px] text-stone-500">Results may need a tweak — AI isn&apos;t always perfect.</p>
              </div>
            )}

            {tab === "text" && (
              <>
                {aiLoading ? (
                  <Working
                    title={importSource.current === "search" ? "Found it. Tidying up the chart…" : "Tidying up the chart…"}
                    detail="This usually takes a few seconds"
                  />
                ) : (
                  <>
                    {aiError && (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{aiError}</p>
                    )}
                    {isJustUrl(text) && (
                      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex gap-2 items-start">
                        <span className="shrink-0 text-sm leading-none">🔗</span>
                        <span className="leading-relaxed">
                          That looks like a <strong>link</strong>, not lyrics. Open it, copy the
                          song&apos;s <strong>words</strong>, and paste the text here — we can&apos;t read
                          a URL. Already-known song? Close this and use{" "}
                          <strong>Find a song</strong> to search by title.
                        </span>
                      </div>
                    )}
                    <div className="relative flex-1 min-h-[220px]">
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => { setText(e.target.value); setMeta({}); setCleaned(false); }}
                        onPaste={() => { pendingAutoClean.current = true; }}
                        spellCheck={false}
                        className="absolute inset-0 w-full h-full text-sm font-mono text-zinc-700 bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2.5 outline-none focus:border-ink resize-none leading-relaxed"
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
                    dragOver ? "border-ink bg-paper"
                    : imageSrc ? "border-zinc-300 bg-zinc-50 cursor-default"
                    : "border-zinc-300 bg-zinc-50 hover:border-ink/40 hover:bg-paper cursor-pointer"
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
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-ink hover:bg-stone-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {ocrLoading ? <><Spinner size={4} /> Scanning with AI…</> : <>🪄 Scan with AI</>}
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer — only shown when there is something to import */}
        {preview.length > 0 && !aiLoading && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-rule bg-white">
            {showReview ? (
              <button
                onClick={backToInput}
                className="text-sm font-medium text-stone-600 hover:text-ink underline underline-offset-4 decoration-ink/20 hover:decoration-ink transition-colors"
              >
                {searchOnly ? "Search again" : "Back to the text"}
              </button>
            ) : <span />}
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 text-sm font-medium bg-ink hover:bg-stone-700 text-white px-5 py-3 rounded-lg transition-colors"
            >
              <span className="text-base leading-none">♪</span> Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
