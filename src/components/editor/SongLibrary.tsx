"use client";

import { useEffect, useState } from "react";
import { listSongs, deleteSong, type StoredSong } from "@/lib/storage";

interface Props {
  onLoad: (song: StoredSong) => void;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SongLibrary({ onLoad, onClose }: Props) {
  const [songs, setSongs] = useState<StoredSong[]>([]);

  useEffect(() => {
    setSongs(listSongs());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSong(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Songs</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8"/>
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {songs.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-400 text-sm">
              No saved songs yet. Hit Save to get started.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {songs.map((song) => (
                <li
                  key={song.id}
                  onClick={() => onLoad(song)}
                  className="group flex items-center gap-3 px-6 py-3.5 hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {song.title || "Untitled Song"}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {song.artist || <span className="italic">No artist</span>}
                      {" · "}
                      {timeAgo(song.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, song.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-400 transition-all shrink-0"
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 2l8 8M10 2l-8 8"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
