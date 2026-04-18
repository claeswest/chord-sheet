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
    "Create, edit and perform chord sheets with AI. Search any song by name, drag chords above lyrics, auto-scroll on stage, and export to PDF. Free to start.",
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
      "Search any song with AI and get a ready-to-play chord sheet in seconds. Drag chords over lyrics, auto-scroll on stage, export to PDF.",
    images: [
      {
        url: "/hero-photo.jpg",
        width: 1200,
        height: 630,
        alt: "Guitarist using ChordSheetMaker on a laptop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChordSheetMaker — AI Chord Sheets for Musicians",
    description:
      "Search any song with AI and get a ready-to-play chord sheet in seconds. Drag chords over lyrics, auto-scroll on stage, export to PDF.",
    images: ["/hero-photo.jpg"],
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
