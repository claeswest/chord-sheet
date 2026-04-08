import { Suspense } from "react";
import SongViewLoader from "@/components/viewer/SongViewLoader";
import LoadingNotes from "@/components/ui/LoadingNotes";

export default function ViewPage() {
  return (
    <Suspense fallback={<LoadingNotes label="Loading song…" />}>
      <SongViewLoader />
    </Suspense>
  );
}
