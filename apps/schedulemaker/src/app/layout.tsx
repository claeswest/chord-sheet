import type { Metadata } from "next";
import { Lexend, Lora, Caveat } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

const DESCRIPTION =
  "Fota schemat som kom hem från skolan och få ett tydligt, färgglatt schema med riktiga namn – redo för kylskåpet. Gratis och utan konto.";
const TITLE = "Fixa schemat – ett skolschema som barnen faktiskt kan läsa";

// The favicon and the iPhone home-screen icon are files next to this one
// (icon.svg, apple-icon.png), which Next links on its own.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Fixa schemat",
  // What a link shows when it is pasted into a chat — which, for a thing
  // parents tell each other about, is how most people will first see it.
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Fixa schemat",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${lexend.variable} ${lora.variable} ${caveat.variable}`}>{children}</body>
    </html>
  );
}
