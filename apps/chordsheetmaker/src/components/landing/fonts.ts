// The marketing pages' two faces: Newsreader for headings, Geist Mono for the
// small labels and the chords. Defined once and imported by each page that
// wears the paper-and-ink look, rather than in the root layout, so the editor
// and the library don't preload type they never set a word in.

import { Newsreader, Geist_Mono } from "next/font/google";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Put this on the page's outermost element; `font-display` and `font-mono` then resolve. */
export const LANDING_FONTS = `${newsreader.variable} ${geistMono.variable}`;
