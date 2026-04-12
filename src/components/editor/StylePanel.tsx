"use client";

import { useState } from "react";
import Link from "next/link";
import { ALL_FONTS, loadGoogleFont, fontByStack, DEFAULT_STYLE } from "@/lib/songStyle";
import type { SongStyle, TextStyle } from "@/lib/songStyle";
import { compressImage } from "@/lib/imageUtils";

interface Props {
  style: SongStyle;
  onChange: (style: SongStyle) => void;
  songTitle?: string;
  songArtist?: string;
  lyricsText?: string;
  isLoggedIn?: boolean;
  activeTab?: "background" | "text";
}

function TextSection({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TextStyle;
  onChange: (v: TextStyle) => void;
}) {
  const currentFont = fontByStack(value.fontFamily ?? "");

  return (
    <div className="py-3 border-b border-zinc-100 last:border-0">
      <select
        value={currentFont.name}
        onChange={(e) => {
          const font = ALL_FONTS.find(f => f.name === e.target.value)!;
          loadGoogleFont(font.url);
          onChange({ ...value, fontFamily: font.stack });
        }}
        className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 bg-white mb-2"
      >
        {ALL_FONTS.map(f => (
          <option key={f.name} value={f.name}>{f.name}</option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-zinc-400 shrink-0">Size</label>
        <input
          type="number"
          min={8}
          max={72}
          value={value.fontSize ?? 14}
          onChange={(e) => onChange({ ...value, fontSize: Number(e.target.value) })}
          className="w-14 text-xs border border-zinc-200 rounded px-2 py-1 outline-none focus:border-indigo-400 bg-white"
        />
        <button
          onClick={() => onChange({ ...value, bold: !value.bold })}
          className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-bold transition-colors ${
            value.bold ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-indigo-300"
          }`}
        >B</button>
        <button
          onClick={() => onChange({ ...value, italic: !value.italic })}
          className={`w-7 h-7 flex items-center justify-center rounded border text-xs italic transition-colors ${
            value.italic ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-indigo-300"
          }`}
        >I</button>
        <span className="text-xs text-zinc-400 ml-auto shrink-0">Color</span>
        <input
          type="color"
          value={value.color ?? "#000000"}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          className="w-7 h-7 rounded border border-zinc-200 cursor-pointer p-0.5"
          title={value.color ?? "#000000"}
        />
      </div>
    </div>
  );
}

const BG_STYLES = [
  { id: "abstract",      label: "Abstract",      emoji: "🎨" },
  { id: "dreamy",        label: "Dreamy",        emoji: "🌙" },
  { id: "cinematic",     label: "Cinematic",     emoji: "🎬" },
  { id: "watercolor",    label: "Watercolor",    emoji: "🖌️" },
  { id: "minimal",       label: "Minimal",       emoji: "⬜" },
  { id: "vintage",       label: "Vintage",       emoji: "📷" },
  { id: "bokeh",         label: "Bokeh",         emoji: "✨" },
  { id: "dramatic",      label: "Dramatic",      emoji: "🎭" },
  { id: "neon",          label: "Neon",          emoji: "💡" },
  { id: "pastel",        label: "Pastel",        emoji: "🌸" },
  { id: "retro",         label: "Retro",         emoji: "📼" },
  { id: "warm",          label: "Warm",          emoji: "🌟" },
  { id: "ethereal",      label: "Ethereal",      emoji: "🌫️" },
  { id: "lofi",          label: "Lo-Fi",         emoji: "🎧" },
  { id: "darkacademia",  label: "Dark Academia", emoji: "📚" },
  { id: "anime",         label: "Anime",         emoji: "⛩️" },
  { id: "ghibli",        label: "Ghibli",        emoji: "🍃" },
  { id: "oilpainting",   label: "Oil Paint",     emoji: "🖼️" },
  { id: "impressionist", label: "Impressionist", emoji: "🌊" },
  { id: "jazz",          label: "Jazz",          emoji: "🎷" },
  { id: "surreal",       label: "Surreal",       emoji: "🌀" },
  { id: "cosmic",        label: "Cosmic",        emoji: "🌌" },
  { id: "vaporwave",     label: "Vaporwave",     emoji: "🌆" },
  { id: "cyberpunk",     label: "Cyberpunk",     emoji: "🤖" },
  { id: "grunge",        label: "Grunge",        emoji: "🎸" },
  { id: "tropical",      label: "Tropical",      emoji: "🌴" },
  { id: "inkwash",       label: "Ink Wash",      emoji: "🖋️" },
  { id: "stainedglass",  label: "Stained Glass", emoji: "🪟" },
  { id: "doubleexposure",label: "Double Exposure",emoji: "📸" },
  { id: "glitch",        label: "Glitch",        emoji: "⚡" },
] as const;

type BgStyleId = (typeof BG_STYLES)[number]["id"];

export default function StylePanel({ style, onChange, songTitle, songArtist, lyricsText, isLoggedIn = false, activeTab = "background" }: Props) {
  const tab = activeTab;
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [theme, setTheme] = useState("");
  const [showStylePopup, setShowStylePopup] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [bgError, setBgError] = useState("");
  const [bgPrompt, setBgPrompt] = useState("");
  const [showBgPopup, setShowBgPopup] = useState(false);
  const [bgStyle, setBgStyle] = useState<BgStyleId>("abstract");
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [editingElement, setEditingElement] = useState<"title"|"artist"|"lyrics"|"chords"|"sections"|null>(null);
  const [imageSource, setImageSource] = useState<"ai"|"upload"|null>(null);
  const [bgMode, setBgMode] = useState<"ai"|"upload">("ai");
  const [confirmReset, setConfirmReset] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const applyUploadedImage = async (dataUrl: string) => {
    const compressed = await compressImage(dataUrl);
    onChange({ ...style, backgroundImage: compressed, overlayOpacity: style.overlayOpacity ?? 0.5 });
    setImageSource("upload");
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => applyUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Paste image anywhere on the background tab
  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
    if (item) { const file = item.getAsFile(); if (file) handleImageFile(file); }
  };

  const handleAiStyle = async () => {
    setAiLoading(true);
    setAiError("");
    setTheme("");
    try {
      const res = await fetch("/api/ai/style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: songTitle, artist: songArtist, lyrics: lyricsText }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAiError(body.error ?? "AI request failed");
        return;
      }
      const data = await res.json();
      [data.style.title, data.style.lyrics, data.style.chords].forEach((s: any) => {
        const font = ALL_FONTS.find(f => f.stack === s.fontFamily);
        if (font) loadGoogleFont(font.url);
      });
      onChange({ ...style, ...data.style });
      setTheme(data.theme ?? "");
      setShowStylePopup(true);
    } catch {
      setAiError("Network error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiBackground = async () => {
    setBgLoading(true);
    setBgError("");
    setBgPrompt("");
    try {
      const res = await fetch("/api/ai/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: songTitle, artist: songArtist, lyrics: lyricsText, bgStyle }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setBgError(body.error ?? "Image generation failed");
        return;
      }
      const data = await res.json();
      if (!data.image) { setBgError(data.error ?? "No image returned"); return; }
      const compressed = await compressImage(data.image);
      onChange({ ...style, backgroundImage: compressed, overlayOpacity: style.overlayOpacity ?? 0.5 });
      setImageSource("ai");
      setBgPrompt(data.prompt ?? "");
      setShowBgPopup(true);
    } catch (e: any) {
      setBgError(e?.message ?? "Network error");
    } finally {
      setBgLoading(false);
    }
  };

  const removeBackground = () => { onChange({ ...style, backgroundImage: undefined }); setBgPrompt(""); setImageSource(null); };
  const reset = () => { onChange(DEFAULT_STYLE); setTheme(""); setBgPrompt(""); };

  const bg = style.background ?? "#ffffff";
  const overlayOpacity = style.overlayOpacity ?? 0.5;

  return (
    <div className="flex-1 overflow-y-auto relative bg-zinc-50">

      {/* ── Background style picker modal ── */}
      {showStylePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between" style={{ background: "#302b63" }}>
              <div>
                <h2 className="text-sm font-semibold text-white">Choose a background style</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>AI will generate an image in this style</p>
              </div>
              <button onClick={() => setShowStylePicker(false)} className="text-white/50 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>
            <div className="p-4 grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
              {BG_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setBgStyle(s.id); setShowStylePicker(false); }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs transition-colors ${
                    bgStyle === s.id
                      ? "border-violet-400 bg-violet-50 text-violet-700 font-semibold"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  <span className="text-2xl leading-none">{s.emoji}</span>
                  <span className="leading-tight text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Style with AI popup ── */}
      {showStylePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
            {/* Colour preview strip using generated background + text colours */}
            <div
              className="w-full h-14 flex items-center justify-center gap-3 px-4"
              style={{ background: style.background ?? "#ffffff" }}
            >
              <span style={{ color: style.title?.color ?? "#18181b", fontFamily: style.title?.fontFamily, fontSize: 15, fontWeight: "bold" }}>
                {songTitle || "Title"}
              </span>
              <span style={{ color: style.lyrics?.color ?? "#27272a", fontFamily: style.lyrics?.fontFamily, fontSize: 12 }}>
                {songArtist || "Artist"}
              </span>
            </div>
            {/* Content */}
            <div className="px-4 py-4 space-y-3">
              {theme && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Style theme</p>
                  <p className="text-xs text-zinc-600 leading-relaxed italic">"{theme}"</p>
                </div>
              )}
              <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-violet-700 mb-0.5">Fonts & colours updated</p>
                <p className="text-xs text-violet-600 leading-snug">Head to the <span className="font-semibold">Text tab</span> to fine-tune fonts, sizes and colours to your liking.</p>
              </div>
              <button
                onClick={() => setShowStylePopup(false)}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Background generated popup ── */}
      {showBgPopup && style.backgroundImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
            {/* Image preview */}
            <div className="w-full h-32 overflow-hidden">
              <img src={style.backgroundImage} alt="Generated background" className="w-full h-full object-cover" />
            </div>
            {/* Content */}
            <div className="px-4 py-4 space-y-3">
              {bgPrompt && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Background description</p>
                  <p className="text-sm text-zinc-600 leading-relaxed italic">"{bgPrompt}"</p>
                </div>
              )}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-3">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-xs font-semibold text-indigo-700">Dim background</p>
                  <span className="text-xs text-indigo-500 font-mono">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={100}
                  value={Math.round(overlayOpacity * 100)}
                  onChange={(e) => onChange({ ...style, overlayOpacity: Number(e.target.value) / 100 })}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-indigo-400">← Background visible</span>
                  <span className="text-xs text-indigo-400">Text readable →</span>
                </div>
              </div>
              <button
                onClick={() => setShowBgPopup(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Style with AI — shown on Text tab ── */}
      {tab === "text" && (
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={handleAiStyle}
            disabled={aiLoading}
            className="w-full flex items-center justify-center gap-1.5 text-xs border border-violet-300 text-violet-600 bg-violet-50 px-3 py-2 rounded-lg hover:bg-violet-100 hover:border-violet-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            {aiLoading ? (
              <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Styling…</>
            ) : "✦ Style with AI"}
          </button>
          {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-[10px] text-zinc-400">or customise below</span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>
        </div>
      )}

      {/* ── Background tab ── */}
      <div
        className={tab !== "background" ? "hidden" : "px-4 py-3 space-y-4"}
        onPaste={handlePaste}
      >

          {/* ── Page color ── */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 transition-colors text-left"
              onClick={() => (document.getElementById("bg-color-input") as HTMLInputElement)?.click()}
            >
              <span className="w-5 h-5 rounded-full border border-zinc-200 shadow-sm shrink-0" style={{ background: bg }} />
              <span className="text-xs font-medium text-zinc-700 flex-1">Page color</span>
              <span className="text-[11px] text-zinc-400 font-mono">{bg}</span>
              <input id="bg-color-input" type="color" value={bg} onChange={(e) => onChange({ ...style, background: e.target.value })} className="sr-only" />
            </button>
          </div>

          {/* ── Background image — segmented toggle ── */}
          <div>
            {/* Toggle */}
            <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 mb-2">
              <button onClick={() => setBgMode("ai")}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${bgMode === "ai" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >✦ Generate with AI</button>
              <button onClick={() => setBgMode("upload")}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${bgMode === "upload" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                <span className="flex items-center justify-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm-4.5 4.5h.008v.008H9V16.5zM3.75 20.25h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12.75c0 .828.672 1.5 1.5 1.5z" />
                  </svg>
                  Upload image
                </span>
              </button>
            </div>

            {/* AI panel */}
            {bgMode === "ai" && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <button onClick={() => setShowStylePicker(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-zinc-100 hover:bg-violet-50 transition-colors text-left"
                >
                  <span className="text-base leading-none shrink-0">{BG_STYLES.find(s => s.id === bgStyle)?.emoji}</span>
                  <span className="text-xs font-medium text-zinc-700 flex-1">Image style</span>
                  <span className="text-[11px] text-zinc-400">{BG_STYLES.find(s => s.id === bgStyle)?.label} ›</span>
                </button>
                {style.backgroundImage && (
                  <div className="border-b border-zinc-100">
                    <div className="relative overflow-hidden mx-3 mt-3 rounded-lg" style={{ height: 72 }}>
                      <img src={style.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                      <button onClick={removeBackground} className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-lg text-base leading-none transition-colors">×</button>
                    </div>
                    <div className="mx-3 my-2.5 bg-zinc-50 rounded-lg px-3 py-2.5">
                      <div className="flex items-center mb-1.5">
                        <span className="text-xs text-zinc-500 flex-1">Dim</span>
                        <span className="text-xs font-mono text-zinc-500 tabular-nums">{Math.round(overlayOpacity * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={Math.round(overlayOpacity * 100)} onChange={(e) => onChange({ ...style, overlayOpacity: Number(e.target.value) / 100 })} className="w-full accent-indigo-500" />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-zinc-400">← Show image</span>
                        <span className="text-[10px] text-zinc-400">Readable text →</span>
                      </div>
                    </div>
                  </div>
                )}
                <button onClick={handleAiBackground} disabled={bgLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-3 transition-colors disabled:opacity-40 font-semibold text-violet-600 hover:bg-violet-50 text-sm"
                >
                  {bgLoading
                    ? <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Generating…</>
                    : imageSource === "ai" ? <>↺ Regenerate</>
                    : imageSource === "upload" ? <>✦ Replace with AI image</>
                    : <>✦ Generate background image</>}
                </button>
              </div>
            )}

            {/* Upload panel */}
            {bgMode === "upload" && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                {style.backgroundImage && (
                  <>
                    <div className="relative overflow-hidden mx-3 mt-3 rounded-lg" style={{ height: 72 }}>
                      <img src={style.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                      <button onClick={removeBackground} className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-lg text-base leading-none transition-colors">×</button>
                    </div>
                    <div className="mx-3 mt-2 mb-3 bg-zinc-50 rounded-lg px-3 py-2.5">
                      <div className="flex items-center mb-1.5">
                        <span className="text-xs text-zinc-500 flex-1">Dim</span>
                        <span className="text-xs font-mono text-zinc-500 tabular-nums">{Math.round(overlayOpacity * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={Math.round(overlayOpacity * 100)} onChange={(e) => onChange({ ...style, overlayOpacity: Number(e.target.value) / 100 })} className="w-full accent-indigo-500" />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-zinc-400">← Show image</span>
                        <span className="text-[10px] text-zinc-400">Readable text →</span>
                      </div>
                    </div>
                    <div className="border-t border-zinc-100" />
                  </>
                )}
                <div
                  onClick={() => (document.getElementById("bg-upload-input") as HTMLInputElement)?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleImageFile(file); }}
                  className={`mx-3 my-3 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-3 px-4 py-3 ${
                    dragOver ? "border-indigo-400 bg-indigo-50 scale-[0.98]" : "border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${dragOver ? "text-indigo-400" : "text-zinc-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {dragOver
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm-4.5 4.5h.008v.008H9V16.5zM3.75 20.25h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12.75c0 .828.672 1.5 1.5 1.5z" />
                    }
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-zinc-600">
                      {dragOver ? "Drop to use this image" : imageSource === "upload" ? "Replace image" : "Drop or click to browse"}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Also supports Ctrl+V paste</p>
                  </div>
                </div>
                <input id="bg-upload-input" type="file" accept="image/*" className="sr-only"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageFile(file); e.target.value = ""; }}
                />
              </div>
            )}
          </div>

          {bgError && <p className="text-xs text-red-500">{bgError}</p>}

          {/* Guest notice */}
          {!isLoggedIn && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <span className="text-sm leading-none shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-medium text-amber-800 leading-snug mb-0.5">Background images won't be saved</p>
                <p className="text-xs text-amber-700 leading-snug mb-1.5">Sign in to keep your generated background.</p>
                <Link href="/login" className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">Sign in →</Link>
              </div>
            </div>
          )}
      </div>

      {/* ── Text tab ── */}
      {tab === "text" && (() => {
        const ELEMENTS = [
          { key: "title"    as const, label: "Title",    value: style.title,                          set: (v: TextStyle) => onChange({ ...style, title: v }) },
          { key: "artist"   as const, label: "Artist",   value: style.artist ?? DEFAULT_STYLE.artist!, set: (v: TextStyle) => onChange({ ...style, artist: v }) },
          { key: "lyrics"   as const, label: "Lyrics",   value: style.lyrics,                         set: (v: TextStyle) => onChange({ ...style, lyrics: v }) },
          { key: "chords"   as const, label: "Chords",   value: style.chords,                         set: (v: TextStyle) => onChange({ ...style, chords: v }) },
          { key: "sections" as const, label: "Sections", value: style.section ?? DEFAULT_STYLE.section!, set: (v: TextStyle) => onChange({ ...style, section: v }) },
        ];
        const active = ELEMENTS.find(e => e.key === editingElement);
        return (
          <>
            {/* ── Text style editor modal ── */}
            {editingElement && active && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-4 flex items-center justify-between" style={{ background: "#302b63" }}>
                    <h2 className="text-sm font-semibold text-white">{active.label}</h2>
                    <button onClick={() => setEditingElement(null)} className="text-white/50 hover:text-white transition-colors text-xl leading-none">×</button>
                  </div>
                  {/* Controls */}
                  <div className="px-5 py-4">
                    <TextSection label={active.label} value={active.value} onChange={active.set} />
                    {editingElement === "title" && (
                      <div className="mt-3 pt-3 border-t border-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 shrink-0">Align</span>
                          <div className="flex rounded border border-zinc-200 overflow-hidden">
                            {(["left", "center"] as const).map((a) => (
                              <button key={a} onClick={() => onChange({ ...style, titleAlign: a })}
                                className={`px-2.5 py-1 text-xs transition-colors ${(style.titleAlign ?? "center") === a ? "bg-indigo-600 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}
                              >{a === "left" ? "Left" : "Center"}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {editingElement === "sections" && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 shrink-0">Align</span>
                          <div className="flex rounded border border-zinc-200 overflow-hidden">
                            {(["left", "center"] as const).map((a) => (
                              <button key={a} onClick={() => onChange({ ...style, sectionAlign: a })}
                                className={`px-2.5 py-1 text-xs transition-colors ${(style.sectionAlign ?? "left") === a ? "bg-indigo-600 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}
                              >{a === "left" ? "Left" : "Center"}</button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 shrink-0">Divider line</span>
                          <button onClick={() => onChange({ ...style, sectionDivider: !(style.sectionDivider ?? true) })}
                            className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${(style.sectionDivider ?? true) ? "bg-indigo-500" : "bg-zinc-200"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(style.sectionDivider ?? true) ? "translate-x-4" : "translate-x-0"}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-5 pb-4">
                    <button onClick={() => setEditingElement(null)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                    >Done</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Compact preview rows ── */}
            <div className="px-4 py-2">
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                {ELEMENTS.map(e => {
                  const font = fontByStack(e.value.fontFamily ?? "");
                  const previewStyle = {
                    fontFamily: e.value.fontFamily,
                    fontSize: Math.min(e.value.fontSize ?? 14, 15),
                    color: e.value.color ?? "#000",
                    fontWeight: e.value.bold ? "700" : "400",
                    fontStyle: e.value.italic ? "italic" : "normal",
                  } as const;
                  return (
                    <button key={e.key} onClick={() => setEditingElement(e.key)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors group text-left"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block truncate" style={previewStyle}>{e.label}</span>
                        <span className="block text-[10px] text-zinc-400 truncate mt-0.5">{font.name} · {e.value.fontSize ?? 14}px</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-zinc-400 font-mono">{e.value.color ?? "#000000"}</span>
                        <span className="w-4 h-4 rounded-full border border-white shadow-sm shrink-0" style={{ background: e.value.color ?? "#000" }} />
                      </span>
                      <span className="text-sm text-zinc-400 group-hover:text-zinc-600 transition-colors shrink-0 px-1">›</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-4 pb-4 pt-2">
              {confirmReset ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 shrink-0">Reset all text styles?</span>
                  <button
                    onClick={() => { reset(); setConfirmReset(false); }}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors px-3 py-1.5 rounded-lg shrink-0"
                  >Reset</button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
                  >Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmReset(true)} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                  ↺ Restore default styles
                </button>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
