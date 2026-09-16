import type { Metadata } from "next";
import { Lexend, Lora, Caveat } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

const DESCRIPTION =
  "Ladda upp skolans schema, anpassa namn och färger och skriv ut på A4 eller A3. Inget konto behövs.";

// The favicon and the iPhone home-screen icon are files next to this one
// (icon.svg, apple-icon.png), which Next links on its own.
export const metadata: Metadata = {
  title: "Fixa schemat – gör skolschemat tydligt och personligt",
  description: DESCRIPTION,
  applicationName: "Fixa schemat",
  // What a link shows when it is pasted into a chat — which, for a thing
  // parents tell each other about, is how most people will first see it.
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Fixa schemat",
    title: "Fixa schemat – gör skolschemat tydligt och personligt",
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
