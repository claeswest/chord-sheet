import type { Metadata } from "next";
import { Lexend, Lora, Caveat } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Schedule Maker",
  description: "Photograph a timetable and get one worth putting on the fridge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${lexend.variable} ${lora.variable} ${caveat.variable}`}>{children}</body>
    </html>
  );
}
