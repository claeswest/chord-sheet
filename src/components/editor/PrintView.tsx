"use client";

import type { SongLine } from "@/types/song";

// 12pt at 96dpi = 16px. Measure at the same size the print CSS uses.
const PRINT_FONT = "16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function measureWidth(text: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = PRINT_FONT;
  return ctx.measureText(text).width;
}

interface Props {
  title: string;
  artist: string;
  lines: SongLine[];
  watermark?: boolean;
}

export default function PrintView({ title, artist, lines, watermark = true }: Props) {
  return (
    <div
      id="print-view"
      className={watermark ? "watermarked" : ""}
    >
      {/* Song header */}
      <div className="print-song-title">{title || "Untitled Song"}</div>
      {artist && <div className="print-song-artist">{artist}</div>}

      {/* Lines */}
      {lines.map((line) => {
        if (line.type === "section") {
          return (
            <div key={line.id} className="print-section">
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
                  const leftPx = measureWidth(line.text.slice(0, chord.position));
                  return (
                    <span
                      key={chord.id}
                      className="print-chord"
                      style={{ left: leftPx }}
                    >
                      {chord.chord}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="print-lyric">{line.text || "\u00A0"}</div>
          </div>
        );
      })}
    </div>
  );
}
