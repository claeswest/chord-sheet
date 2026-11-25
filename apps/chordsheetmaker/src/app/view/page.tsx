"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import WorkingNotes from "@/components/ui/WorkingNotes";

const SongViewLoader = dynamic(() => import("@/components/viewer/SongViewLoader"), {
  ssr: false,
  loading: () => <WorkingNotes title="Loading song…" className="h-screen" />,
});

export default function ViewPage() {
  return (
    <Suspense fallback={<WorkingNotes title="Loading song…" className="h-screen" />}>
      <SongViewLoader />
    </Suspense>
  );
}
