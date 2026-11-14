import { ImageResponse } from "next/og";
import { LANDING_SLUGS, getLandingPage } from "@/data/landingPages";

export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_SLUGS.map((slug) => ({ slug }));
}

export const alt = "ChordSheetMaker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  // A promise since Next 16. Read as a plain object it gave no slug, so every
  // keyword page shared the fallback card with no headline of its own.
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  const headline = page ? `${page.h1} ${page.h1Accent}` : "ChordSheetMaker";
  const tagline = page?.eyebrow ?? "Create chord sheets online";

  // Paper, ink and the chord colour, as on the page itself. Drawn with the
  // renderer's built-in face: no font file, no fetch.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#faf6ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#1c1917" }}>
          <span>ChordSheet</span>
          <span style={{ color: "#1c4a94" }}>Maker</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: "#1c4a94",
            }}
          >
            {tagline}
          </div>
          <div
            style={{
              fontSize: 70,
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            {headline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 27, color: "#57534e", borderTop: "2px solid #e0d7c6", paddingTop: 28 }}>
          Free online chord sheet maker · No credit card required
        </div>
      </div>
    ),
    { ...size }
  );
}
