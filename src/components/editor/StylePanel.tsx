"use client";

import { ALL_FONTS, loadGoogleFont, fontByStack, DEFAULT_STYLE } from "@/lib/songStyle";
import type { SongStyle, TextStyle } from "@/lib/songStyle";

interface Props {
  style: SongStyle;
  onChange: (style: SongStyle) => void;
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

export default function StylePanel({ style, onChange }: Props) {
  const reset = () => onChange(DEFAULT_STYLE);
  const bg = style.background ?? "#ffffff";

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-zinc-50">
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
