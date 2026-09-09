import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schedule Maker",
  description: "Photograph a timetable and get one worth putting on the fridge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
