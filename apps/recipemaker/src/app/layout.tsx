import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// Nunito is the only webfont. Body copy is Georgia and the interface is the
// system sans — both already on every device, so nothing blocks first paint.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

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
      <body className={nunito.variable}>{children}</body>
    </html>
  );
}
