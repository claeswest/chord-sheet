import { ImageResponse } from "next/og";

// Social share card (og:image) — rendered in code so it never goes stale.
// Shown when chordsheetmaker.ai is pasted into WhatsApp, Facebook, Slack, X…

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ChordSheetMaker — turn any song into a stage-ready chord chart";

const CHORDS: [string, number][][] = [
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
          background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #1a1640 100%)",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: brand + headline */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, paddingRight: 48 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#ffffff", marginBottom: 36 }}>
            Chord<span style={{ color: "#818cf8" }}>Sheet</span>Maker
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 62, fontWeight: 800, color: "#ffffff", lineHeight: 1.15 }}>
            <span>Turn any song into a</span>
            <span style={{ color: "#a5b4fc" }}>stage-ready chord chart</span>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.55)", marginTop: 28 }}>
            AI finds the chords · transpose to your key · auto-scroll on stage
          </div>
        </div>

        {/* Right: mini chart card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 380,
            borderRadius: 24,
            background: "linear-gradient(150deg, #14102e 0%, #241b4d 60%, #3b1060 100%)",
            border: "2px solid rgba(129,140,248,0.5)",
            padding: "32px 36px",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#e8f95c", marginBottom: 6 }}>
            Midnight Highway
          </div>
          <div style={{ display: "flex", justifyContent: "center", fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>
            The Wanderers
          </div>
          {CHORDS.map((row, r) => (
            <div key={r} style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
              <div style={{ display: "flex", position: "relative", height: 22 }}>
                {row.map(([c, left]) => (
                  <span key={c + left} style={{ position: "absolute", left, fontSize: 18, fontWeight: 700, color: "#f472b6" }}>
                    {c}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", height: 10, width: 300 - r * 40, borderRadius: 5, background: "rgba(255,255,255,0.35)" }} />
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
