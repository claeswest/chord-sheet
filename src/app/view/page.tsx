"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import LoadingNotes from "@/components/ui/LoadingNotes";

const SongViewLoader = dynamic(() => import("@/components/viewer/SongViewLoader"), {
  ssr: false,
  loading: () => <LoadingNotes label="Loading song…" />,
});

export default function ViewPage() {
  return (
    <Suspense fallback={<LoadingNotes label="Loading song…" />}>
      <SongViewLoader />
    </Suspense>
  );
}
