import type { Metadata } from "next";
import { Geist, Nunito } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["700", "800"] });

export const metadata: Metadata = {
  title: {
    default: "RecipeMaker — your recipes, beautifully kept",
    template: "%s | RecipeMaker",
  },
  description:
    "Write, import and style your recipes, then keep them in one place. Build a personal cookbook worth passing on.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
