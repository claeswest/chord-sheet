import type { Metadata } from "next";

// /print is the page the server's own browser prints from. It is empty for
// anyone else, and an empty page has no business in a search result.
export const metadata: Metadata = {
  title: "Utskrift",
  robots: { index: false, follow: false },
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
