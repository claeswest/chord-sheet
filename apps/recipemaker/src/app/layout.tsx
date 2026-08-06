import type { Metadata } from "next";
import { Nunito, Fraunces, Playfair_Display, Lora, Work_Sans, Caveat } from "next/font/google";
import "./globals.css";

// Nunito carries the interface and is the only font that loads eagerly — the
// app chrome needs it on first paint.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// The canvas faces: what a *recipe* can be set in, chosen per recipe by the
// style generator. All are preload:false on purpose. They are not used by the
// landing page, the library or the editor chrome, so preloading them would
// cost every visitor bytes for something most pages never render. They load
// when a styled recipe actually asks for them.
//
// Kept deliberately small. Every extra family is weight on the wire, and the
// generator picks better from a short list of faces that clearly differ than
// from a long list of near-duplicates.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Handwriting, for the "copied from a family notebook" look. Display only —
// a whole method set in it would be a chore to read from a worktop.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const FONT_VARS = [nunito, fraunces, playfair, lora, workSans, caveat]
  .map((f) => f.variable)
  .join(" ");

const BASE_URL = "https://recipebookmaker.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "RecipeBookMaker — your recipes, beautifully kept",
    template: "%s | RecipeBookMaker",
  },
  description:
    "Write, import and style your recipes, then keep them in one place. Build a personal recipe book worth passing on.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={FONT_VARS}>{children}</body>
    </html>
  );
}
