"use client";

import { useState } from "react";
import { listSongs, deleteSong } from "@/lib/storage";
import { upsertSong } from "@/lib/songDb";

interface Props {
  onImported: () => void; // tell parent to re-fetch songs
}

export default function GuestImportBanner({ onImported }: Props) {
  const songs = listSongs();
  const count = songs.length;

  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  if (count === 0 || state === "done") return null;

  const handleImport = async () => {
    setState("loading");
    setError("");
    try {
      for (const song of songs) {
        await upsertSong({
          id: song.id,
          title: song.title,
          artist: song.artist ?? "",
          lines: song.lines,
          tags: song.tags ?? [],
        });
        deleteSong(song.id);
      }
      setState("done");
      onImported();
    } catch {
      setError("Something went wrong. Please try again.");
      setState("idle");
    }
  };

  const handleDismiss = () => {
    // Mark dismissed so the banner won't reappear
    localStorage.setItem("guestImportDismissed", "true");
    setState("done");
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white px-5 py-4 flex gap-4 items-start shadow-sm">
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5 text-indigo-500">
          <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9Z"/>
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800">
          {count === 1
            ? "You have 1 song from before you signed in"
            : `You have ${count} songs from before you signed in`}
        </p>
        <p className="text-sm text-zinc-500 mt-0.5 leading-snug">
          {count === 1
            ? "This song was created without an account and is only stored in this browser. Add it to your account so it's saved safely and available on all your devices."
            : `These songs were created without an account and are only stored in this browser. Add them to your account so they're saved safely and available on all your devices.`}
        </p>

        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleImport}
            disabled={state === "loading"}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {state === "loading" ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Adding…
              </>
            ) : (
              <>
                {count === 1 ? "Add song to my account" : `Add ${count} songs to my account`}
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>

      {/* Dismiss × */}
      <button
        onClick={handleDismiss}
        className="text-zinc-300 hover:text-zinc-500 transition-colors shrink-0 mt-0.5 text-lg leading-none"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
