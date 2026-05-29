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
  params: { slug: string };
}

export default async function OgImage({ params }: Props) {
  const page = getLandingPage(params.slug);
  const headline = page ? `${page.h1} ${page.h1Accent}` : "ChordSheetMaker";
  const tagline = page?.eyebrow ?? "Create chord sheets online";

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
          background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #1a1640 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              fontSize: 44,
              color: "white",
            }}
          >
            𝄞
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "white" }}>
            <span>ChordSheet</span>
            <span style={{ color: "#a78bfa" }}>Maker</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#a5b4fc",
            }}
          >
            {tagline}
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              maxWidth: 1000,
            }}
          >
            {headline}
          </div>
        </div>

        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.55)" }}>
          Free online chord sheet maker · No credit card required
        </div>
      </div>
    ),
    { ...size }
  );
}
