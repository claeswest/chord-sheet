import type { Metadata } from "next";
import SchedulerApp from "@/components/SchedulerApp";

// The editor: steps two and three, for the schedule this browser has open.
// With none, it sends the visitor to the start page. Not for search engines:
// to anyone else it is an empty page.
export const metadata: Metadata = {
  title: "Ditt schema – Fixa schemat",
  robots: { index: false, follow: false },
};

export default function EditorPage() {
  return <SchedulerApp view="editor" />;
}
