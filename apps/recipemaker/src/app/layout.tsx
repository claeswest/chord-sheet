import type { Metadata } from "next";
import { Nunito, Fraunces, Playfair_Display, Lora, Work_Sans, Caveat } from "next/font/google";
import "./globals.css";

// The chrome's three faces. These load eagerly because the app is set in them:
// Fraunces on headings, Lora on body copy, Work Sans on controls. Anything the
// first paint needs must not wait for a lazy fetch, or the page arrives in
// fallback faces and reflows.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
});

// Nunito is now canvas-only — it backs the "rounded" key a recipe can be set
// in. It carried the chrome's headings until Fraunces took over.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  preload: false,
});

// Canvas-only faces: what a *recipe* can be set in and the chrome never uses.
// preload:false on purpose — the landing page, the library and the editor
// don't render them, so preloading would cost every visitor bytes for
// something most pages never show. They load when a styled recipe asks.
//
// Fraunces, Lora and Work Sans are available to recipes too, but they're
// declared above because the chrome needs them first.
const playfair = Playfair_Display({
  variable: "--font-playfair",
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
