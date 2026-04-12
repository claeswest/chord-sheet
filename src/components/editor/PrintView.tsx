"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SongLine } from "@/types/song";
import type { SongStyle } from "@/lib/songStyle";
import { DEFAULT_STYLE, MONO_STACK, backgroundStyle } from "@/lib/songStyle";

// At print resolution 96dpi: 1pt = 96/72 px ≈ 1.333px
// So 12pt ≈ 16px, which is what the baseline print CSS targets.
const PT_TO_PX = 96 / 72;

function measureWidth(text: string, fontPx: number, family: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontPx}px ${family}`;
  return ctx.measureText(text).width;
}

interface Props {
  title: string;
  artist: string;
  lines: SongLine[];
  watermark?: boolean;
  songStyle?: SongStyle;
}

export default function PrintView({ title, artist, lines, watermark = true, songStyle }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const s = songStyle ?? DEFAULT_STYLE;

  // When a background image is present, override @page margins to zero so the
  // image bleeds to the edge. Equivalent padding is added inside the div instead.
  useEffect(() => {
    if (!s.backgroundImage) return;
    const el = document.createElement("style");
    el.id = "print-full-bleed";
    el.textContent = `
      @page { margin: 0; }
      @media print { #print-view { padding: 18mm 18mm 24mm 18mm !important; } }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, [s.backgroundImage]);

  if (!mounted) return null;

  // Convert style px sizes → pt for consistent print layout
  const toPt = (px: number) => Math.round(px * 72 / 96);

  const titlePt   = toPt(s.title.fontSize  ?? 20);
  const artistPt  = toPt((s.artist?.fontSize ?? 13));
  const lyricPt   = toPt(s.lyrics.fontSize  ?? 14);
  const chordPt   = toPt(s.chords.fontSize  ?? 12);

  // Chord positions must be measured at the same font the browser will print with
  const lyricFontPx   = lyricPt * PT_TO_PX;
  const lyricFamily   = s.lyrics.fontFamily  ?? MONO_STACK;
  const chordFamily   = s.chords.fontFamily  ?? MONO_STACK;

  const bgStyle = backgroundStyle(s);

  const content = (
    <div
      id="print-view"
      className={watermark ? "watermarked" : ""}
      style={bgStyle}
    >
      {/* Song header */}
      <div
        className="print-song-title"
        style={{
          fontSize:   `${titlePt}pt`,
          fontFamily: s.title.fontFamily ?? MONO_STACK,
          fontWeight: s.title.bold !== false ? "bold" : "normal",
          fontStyle:  s.title.italic ? "italic" : "normal",
          color:      s.title.color ?? "#18181b",
          textAlign:  s.titleAlign ?? "center",
        }}
      >
        {title || "Untitled Song"}
      </div>

      {artist && (
        <div
          className="print-song-artist"
          style={{
            fontSize:   `${artistPt}pt`,
            fontFamily: s.artist?.fontFamily ?? MONO_STACK,
            fontWeight: s.artist?.bold ? "bold" : "normal",
            fontStyle:  s.artist?.italic ? "italic" : "normal",
            color:      s.artist?.color ?? "#555",
            textAlign:  s.titleAlign ?? "center",
          }}
        >
          {artist}
        </div>
      )}

      {/* Lines */}
      {lines.map((line) => {
        if (line.type === "section") {
          const sectionColor = s.section?.color ?? s.chords.color ?? "#4f46e5";
          const sectionPt = toPt(s.section?.fontSize ?? 11);
          const align = s.sectionAlign ?? "left";
          const showDivider = s.sectionDivider ?? true;
          return (
            <div
              key={line.id}
              className="print-section"
              style={{
                color: sectionColor,
                fontSize: `${sectionPt}pt`,
                fontFamily: s.section?.fontFamily ?? s.chords.fontFamily ?? MONO_STACK,
                fontWeight: (s.section?.bold ?? true) ? "bold" : "normal",
                fontStyle: (s.section?.italic ?? false) ? "italic" : "normal",
                borderBottomColor: showDivider ? sectionColor : "transparent",
                borderBottomWidth: showDivider ? undefined : 0,
                textAlign: align,
              }}
            >
              {line.label}
            </div>
          );
        }

        const hasChords = line.chords.length > 0;
        return (
          <div
            key={line.id}
            className={`print-lyric-block${hasChords ? "" : " no-chords"}`}
          >
            {hasChords && (
              <div className="print-chord-row">
                {line.chords.map((chord) => {
                  const charW = measureWidth("M", lyricFontPx, lyricFamily);
                  const leftPx = chord.position >= line.text.length
                    ? measureWidth(line.text, lyricFontPx, lyricFamily) + (chord.position - line.text.length) * charW
                    : measureWidth(line.text.slice(0, chord.position), lyricFontPx, lyricFamily);
                  return (
                    <span
                      key={chord.id}
                      className="print-chord"
                      style={{
                        left:       leftPx,
                        fontSize:   `${chordPt}pt`,
                        fontFamily: chordFamily,
                        fontWeight: s.chords.bold !== false ? "bold" : "normal",
                        fontStyle:  s.chords.italic ? "italic" : "normal",
                        color:      s.chords.color ?? "#4f46e5",
                      }}
                    >
                      {chord.chord}
                    </span>
                  );
                })}
              </div>
            )}
            <div
              className="print-lyric"
              style={{
                fontSize:   `${lyricPt}pt`,
                fontFamily: lyricFamily,
                fontWeight: s.lyrics.bold ? "bold" : "normal",
                fontStyle:  s.lyrics.italic ? "italic" : "normal",
                color:      s.lyrics.color ?? "#27272a",
              }}
            >
              {line.text || "\u00A0"}
            </div>
          </div>
        );
      })}
    </div>
  );

  return createPortal(content, document.body);
}
