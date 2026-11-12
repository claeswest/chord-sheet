import type { Metadata } from "next";
import { Geist, Nunito } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const BASE_URL = "https://chordsheetmaker.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ChordSheetMaker — AI Chord Sheets for Musicians",
    template: "%s | ChordSheetMaker",
  },
  description:
    "Create, edit and play chord sheets with AI. Search any song by name, drag chords above lyrics, auto-scroll hands-free at home or on stage, and export to PDF. Free to start.",
  keywords: [
    "chord sheets",
    "chord chart",
    "guitar chords",
    "song chords",
    "chord sheet maker",
    "chord sheet creator",
    "music chord sheets",
    "chord sheet app",
    "AI chord sheets",
    "chord sheet generator",
  ],
  authors: [{ name: "ChordSheetMaker" }],
  creator: "ChordSheetMaker",
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "ChordSheetMaker",
    title: "ChordSheetMaker — AI Chord Sheets for Musicians",
    description:
      "Search any song with AI and get a ready-to-play chord sheet in seconds. Drag chords over lyrics, auto-scroll hands-free, export to PDF.",
    // The image comes from opengraph-image.tsx (and twitter-image.tsx, which
    // re-exports it). Listing one here as well would only be overridden.
  },
  twitter: {
    card: "summary_large_image",
    title: "ChordSheetMaker — AI Chord Sheets for Musicians",
    description:
      "Search any song with AI and get a ready-to-play chord sheet in seconds. Drag chords over lyrics, auto-scroll hands-free, export to PDF.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
