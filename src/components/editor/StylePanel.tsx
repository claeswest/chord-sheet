"use client";

import { useState } from "react";
import { ALL_FONTS, loadGoogleFont, fontByStack, DEFAULT_STYLE } from "@/lib/songStyle";
import type { SongStyle, TextStyle } from "@/lib/songStyle";
import { compressImage } from "@/lib/imageUtils";

interface Props {
  style: SongStyle;
  onChange: (style: SongStyle) => void;
  songTitle?: string;
  songArtist?: string;
  lyricsText?: string;
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
      <p className="text-xs font-bold text-zinc-800 uppercase tracking-wide mb-2">{label}</p>

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
        <input
          type="color"
          value={value.color ?? "#000000"}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          className="w-7 h-7 rounded border border-zinc-200 cursor-pointer p-0.5 ml-auto"
          title={value.color ?? "#000000"}
        />
      </div>
    </div>
  );
}

const BG_STYLES = [
  { id: "abstract",    label: "Abstract",    emoji: "🎨" },
  { id: "landscape",   label: "Landscape",   emoji: "🌄" },
  { id: "sunset",      label: "Sunset",      emoji: "🌅" },
  { id: "forest",      label: "Forest",      emoji: "🌲" },
  { id: "ocean",       label: "Ocean",       emoji: "🌊" },
  { id: "vintage",     label: "Vintage",     emoji: "📷" },
  { id: "bokeh",       label: "Bokeh",       emoji: "✨" },
  { id: "performance", label: "Performance", emoji: "🎸" },
  { id: "festival",    label: "Festival",    emoji: "🎉" },
  { id: "neon",        label: "Neon",        emoji: "💜" },
  { id: "pastel",      label: "Pastel",      emoji: "🌸" },
  { id: "minimal",     label: "Minimal",     emoji: "⬜" },
  { id: "dramatic",    label: "Dramatic",    emoji: "🎭" },
  { id: "retro",       label: "Retro",       emoji: "🕹️" },
  { id: "acoustic",    label: "Acoustic",    emoji: "🪕" },
] as const;

type BgStyleId = (typeof BG_STYLES)[number]["id"];
type StyleTab = "background" | "text";

export default function StylePanel({ style, onChange, songTitle, songArtist, lyricsText }: Props) {
  const [tab, setTab] = useState<StyleTab>("background");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [theme, setTheme] = useState("");
  const [bgLoading, setBgLoading] = useState(false);
  const [bgError, setBgError] = useState("");
  const [bgPrompt, setBgPrompt] = useState("");
  const [bgStyle, setBgStyle] = useState<BgStyleId>("abstract");

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
      setTab("text");
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
      setBgPrompt(data.prompt ?? "");
    } catch (e: any) {
      setBgError(e?.message ?? "Network error");
    } finally {
      setBgLoading(false);
    }
  };

  const removeBackground = () => { onChange({ ...style, backgroundImage: undefined }); setBgPrompt(""); };
  const reset = () => { onChange(DEFAULT_STYLE); setTheme(""); setBgPrompt(""); };

  const bg = style.background ?? "#ffffff";
  const overlayOpacity = style.overlayOpacity ?? 0.5;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50">

      {/* ── Style with AI — always visible ── */}
      <div className="px-4 py-3 border-b border-zinc-200">
        <button
          onClick={handleAiStyle}
          disabled={aiLoading}
          className="w-full flex items-center justify-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {aiLoading ? (
            <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Styling…</>
          ) : "✦ Style with AI"}
        </button>
        {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
        {theme && <p className="text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-1.5 mt-2 leading-relaxed">{theme}</p>}
      </div>

      {/* ── Sub-tabs — sticky so always visible while scrolling ── */}
      <div className="flex border-b border-zinc-200 bg-zinc-50">
        <button
          onClick={() => setTab("background")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === "background" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}
        >Background</button>
        <button
          onClick={() => setTab("text")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === "text" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}
        >Text</button>
      </div>

      {/* ── Background tab ── */}
      <div className={tab !== "background" ? "hidden" : "px-4 py-3 space-y-4"}>
        <div>
          <p className="text-xs font-bold text-zinc-800 uppercase tracking-wide mb-2">Color</p>
          <div className="flex items-center gap-2">
            <input type="color" value={bg} onChange={(e) => onChange({ ...style, background: e.target.value })} className="w-8 h-7 rounded border border-zinc-200 cursor-pointer p-0.5" />
            <span className="text-xs text-zinc-400 font-mono">{bg}</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-zinc-800 uppercase tracking-wide mb-2">AI Background Image</p>
          <div className="grid grid-cols-5 gap-1 mb-3">
            {BG_STYLES.map((s) => (
              <button key={s.id} onClick={() => setBgStyle(s.id)}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border text-xs transition-colors ${bgStyle === s.id ? "border-violet-400 bg-violet-50 text-violet-700 font-medium" : "border-zinc-200 bg-white text-zinc-500 hover:border-violet-200"}`}
              >
                <span className="text-base leading-none">{s.emoji}</span>
                <span className="leading-none">{s.label}</span>
              </button>
            ))}
          </div>

          {style.backgroundImage ? (
            <>
              <div className="relative mb-2 rounded overflow-hidden" style={{ height: 80 }}>
                <img src={style.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                <button onClick={removeBackground} className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded text-xs" title="Remove">×</button>
              </div>
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-zinc-400">Fade</label>
                  <span className="text-xs text-zinc-400 font-mono">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input type="range" min={0} max={100} value={Math.round(overlayOpacity * 100)} onChange={(e) => onChange({ ...style, overlayOpacity: Number(e.target.value) / 100 })} className="w-full accent-indigo-500" />
              </div>
              {bgPrompt && <p className="text-xs text-zinc-400 italic leading-relaxed mb-2">{bgPrompt}</p>}
              <button onClick={handleAiBackground} disabled={bgLoading}
                className="w-full flex items-center justify-center gap-1 text-xs text-violet-600 border border-violet-200 hover:border-violet-400 hover:bg-violet-50 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                {bgLoading ? <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Generating…</> : "↺ Regenerate"}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleAiBackground} disabled={bgLoading}
                className="w-full flex items-center justify-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 font-medium"
              >
                {bgLoading ? <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Generating…</> : "✦ Generate Background"}
              </button>
              {bgError && <p className="text-xs text-red-500 mt-2">{bgError}</p>}
            </>
          )}
        </div>
      </div>

      {/* ── Text tab ── */}
      <div className={tab !== "text" ? "hidden" : "px-4 py-1"}>
        <TextSection label="Title"   value={style.title}                        onChange={(v) => onChange({ ...style, title: v })} />
        <TextSection label="Artist"  value={style.artist ?? DEFAULT_STYLE.artist} onChange={(v) => onChange({ ...style, artist: v })} />
        <TextSection label="Lyrics"  value={style.lyrics}                       onChange={(v) => onChange({ ...style, lyrics: v })} />
        <TextSection label="Chords"  value={style.chords}                       onChange={(v) => onChange({ ...style, chords: v })} />
        <TextSection label="Sections" value={style.section ?? DEFAULT_STYLE.section!} onChange={(v) => onChange({ ...style, section: v })} />

        <div className="py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-2">
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
              className={`w-8 h-4 rounded-full transition-colors relative ${(style.sectionDivider ?? true) ? "bg-indigo-500" : "bg-zinc-200"}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${(style.sectionDivider ?? true) ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="py-3">
          <button onClick={reset} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Reset to defaults</button>
        </div>
      </div>
    </div>
  );
}
