import { Suspense } from "react";
import SongViewLoader from "@/components/viewer/SongViewLoader";

export default function ViewPage() {
  return (
    <Suspense fallback={null}>
      <SongViewLoader />
    </Suspense>
  );
}
