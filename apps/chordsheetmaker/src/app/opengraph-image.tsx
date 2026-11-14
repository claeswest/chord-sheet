import { ImageResponse } from "next/og";

// Social share card (og:image) — rendered in code so it never goes stale.
// Shown when chordsheetmaker.ai is pasted into WhatsApp, Facebook, Slack, X…
//
// Paper, ink and the chord colour, like the site. The site's serif is not
// here: the card is drawn with the renderer's built-in face, so it needs no
// font file and no fetch. The headline carries the same chords the start
// page's does.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ChordSheetMaker — turn any song into a stunning chord chart";

const PAPER = "#faf6ee";
const INK = "#1c1917";
const CHORD = "#1c4a94";
const MUTED = "#57534e";
const RULE = "#e0d7c6";

/** The headline, word by word, with the chord that sits over it (or none). */
const HEADLINE: [word: string, chord?: string][][] = [
  [["Turn", "G"], ["any"], ["song", "D"], ["into"], ["a"]],
  [["stunning", "Em"], ["chord"], ["chart", "C"]],
];

const CHART: [string, number][][] = [
  [["Am", 0], ["F", 130], ["G", 250]],
  [["C", 0], ["G", 150], ["Am", 280]],
  [["F", 0], ["C", 120], ["G", 260]],
];

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: brand + headline */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 48 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: INK }}>
            ChordSheet<span style={{ color: CHORD }}>Maker</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {HEADLINE.map((line, i) => (
              <div key={i} style={{ display: "flex", marginBottom: 6 }}>
                {line.map(([word, chord]) => (
                  <div key={word} style={{ display: "flex", flexDirection: "column", marginRight: 18 }}>
                    <span style={{ height: 30, fontSize: 22, fontWeight: 700, color: CHORD }}>{chord ?? ""}</span>
                    <span style={{ fontSize: 68, fontWeight: 800, color: INK, lineHeight: 1.05, letterSpacing: -1.5 }}>{word}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", fontSize: 25, color: MUTED }}>
            AI finds the chords · transpose to your key · auto-scroll on stage
          </div>
        </div>

        {/* Right: a sheet of paper with a chart on it */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 380,
            borderRadius: 16,
            background: "#ffffff",
            border: `2px solid ${RULE}`,
            boxShadow: "0 30px 50px -30px rgba(28,25,23,0.45)",
            padding: "36px 36px",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 27, fontWeight: 800, color: INK, marginBottom: 6 }}>
            Midnight Highway
          </div>
          <div style={{ display: "flex", fontSize: 16, color: MUTED, marginBottom: 30 }}>
            The Wanderers
          </div>
          {CHART.map((row, r) => (
            <div key={r} style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
              <div style={{ display: "flex", position: "relative", height: 24 }}>
                {row.map(([c, left]) => (
                  <span key={c + left} style={{ position: "absolute", left, fontSize: 19, fontWeight: 700, color: CHORD }}>
                    {c}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", height: 10, width: 300 - r * 40, borderRadius: 5, background: "#d6d3d1" }} />
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
