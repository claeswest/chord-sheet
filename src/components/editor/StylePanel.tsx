"use client";

import { useState } from "react";
import { ALL_FONTS, loadGoogleFont, fontByStack, DEFAULT_STYLE } from "@/lib/songStyle";
import type { SongStyle, TextStyle } from "@/lib/songStyle";

interface Props {
  style: SongStyle;
  onChange: (style: SongStyle) => void;
  songTitle?: string;
  songArtist?: string;
  lyricsText?: string;
}

function Section({
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
    <div className="px-4 py-3 border-b border-zinc-100">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{label}</p>

      {/* Font selector */}
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

      {/* Size + Bold + Italic row */}
      <div className="flex items-center gap-1.5 mb-2">
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
          title="Bold"
        >B</button>
        <button
          onClick={() => onChange({ ...value, italic: !value.italic })}
          className={`w-7 h-7 flex items-center justify-center rounded border text-xs italic transition-colors ${
            value.italic ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-indigo-300"
          }`}
          title="Italic"
        >I</button>
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-400 shrink-0">Color</label>
        <input
          type="color"
          value={value.color ?? "#000000"}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          className="w-8 h-7 rounded border border-zinc-200 cursor-pointer p-0.5"
        />
        <span className="text-xs text-zinc-400 font-mono">{value.color ?? "#000000"}</span>
      </div>
    </div>
  );
}

export default function StylePanel({ style, onChange, songTitle, songArtist, lyricsText }: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [theme, setTheme] = useState("");

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
      // Ensure Google Fonts are loaded
      [data.style.title, data.style.lyrics, data.style.chords].forEach((s: any) => {
        const font = ALL_FONTS.find(f => f.stack === s.fontFamily);
        if (font) loadGoogleFont(font.url);
      });
      onChange(data.style);
      setTheme(data.theme ?? "");
    } catch {
      setAiError("Network error");
    } finally {
      setAiLoading(false);
    }
  };

  const reset = () => { onChange(DEFAULT_STYLE); setTheme(""); };
  const bg = style.background ?? "#ffffff";

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-zinc-50">
      {/* AI Style button */}
      <div className="px-4 py-3 border-b border-zinc-100">
        <button
          onClick={handleAiStyle}
          disabled={aiLoading}
          className="w-full flex items-center justify-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {aiLoading ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Styling…
            </>
          ) : "✦ Style with AI"}
        </button>
        {aiError && (
          <p className="text-xs text-red-500 mt-2">{aiError}</p>
        )}
        {theme && (
          <p className="text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-1.5 mt-2 leading-relaxed">
            {theme}
          </p>
        )}
      </div>

      {/* Background */}
      <div className="px-4 py-3 border-b border-zinc-100">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Background</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={bg}
            onChange={(e) => onChange({ ...style, background: e.target.value })}
            className="w-8 h-7 rounded border border-zinc-200 cursor-pointer p-0.5"
          />
          <span className="text-xs text-zinc-400 font-mono">{bg}</span>
        </div>
      </div>

      <Section
        label="Title"
        value={style.title}
        onChange={(v) => onChange({ ...style, title: v })}
      />
      <Section
        label="Lyrics"
        value={style.lyrics}
        onChange={(v) => onChange({ ...style, lyrics: v })}
      />
      <Section
        label="Chords"
        value={style.chords}
        onChange={(v) => onChange({ ...style, chords: v })}
      />
      <div className="px-4 py-3">
        <button
          onClick={reset}
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
