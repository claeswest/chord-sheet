"use client";

// Shown instead of an editor when a signed-in free user is already at the
// song limit.
//
// The alternative was worse than a wall: the editor opened, they wrote a
// chart, and the first auto-save came back 403 — at which point the app
// redirected them to /songs mid-sentence, losing the work and explaining
// nothing on the way. Being told before you start is the kinder half of a
// paywall, and the only half that doesn't cost someone a chart.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { trackPaywallSeen } from "@/lib/analytics";

export default function NewSongAtLimit({ limit }: { limit: number }) {
  // Fired once, like the library's modal, so this moment shows up in the
  // funnel rather than being an invisible dead end.
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackPaywallSeen("song_limit_new_editor");
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-500">
              <path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900">
              You&apos;ve reached the free limit
            </h1>
            <p className="text-xs text-zinc-500">Free includes {limit} songs</p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-zinc-600">
          Go Pro for{" "}
          <strong className="text-zinc-800">unlimited songs, PDF export and sharing</strong>. Try
          it free for 7 days; you won&apos;t be charged today.
        </p>

        <div className="flex gap-2">
          <Link
            href="/songs"
            className="flex-1 rounded-lg bg-zinc-100 px-4 py-2 text-center text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
          >
            Back to my songs
          </Link>
          <Link
            href="/pricing"
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Start free trial →
          </Link>
        </div>
      </div>
    </div>
  );
}
