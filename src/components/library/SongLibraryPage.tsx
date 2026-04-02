"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { encodeSong } from "@/lib/songUrl";
import { fetchSongs, removeSong, upsertSong, type DbSong } from "@/lib/songDb";
import { listSongs, deleteSong, updateSongTags } from "@/lib/storage";

const PRESET_TAGS = ["Worship", "Pop", "Rock", "Folk", "Country", "Blues", "Jazz", "Original", "Cover", "Setlist"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

type Song = DbSong & { source: "db" | "local" };

interface Props {
  isLoggedIn: boolean;
}

export default function SongLibraryPage({ isLoggedIn }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isLoggedIn) {
          const db = await fetchSongs();
          setSongs(db.map((s) => ({ ...s, source: "db" as const })));
        } else {
          const local = listSongs();
          setSongs(
            local.map((s) => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              lines: s.lines,
              tags: s.tags ?? [],
              updatedAt: s.updatedAt,
              source: "local" as const,
            }))
          );
        }
      } catch {
        // fall back silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isLoggedIn]);

  const handleDelete = async (id: string, source: "db" | "local") => {
    if (source === "db") await removeSong(id);
    else deleteSong(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleTag = async (songId: string, tag: string) => {
    const song = songs.find((s) => s.id === songId);
    if (!song) return;
    const next = song.tags.includes(tag)
      ? song.tags.filter((t) => t !== tag)
      : [...song.tags, tag];
    setSongs((prev) => prev.map((s) => s.id === songId ? { ...s, tags: next } : s));
    if (song.source === "db") {
      await upsertSong({ id: song.id, title: song.title, artist: song.artist, lines: song.lines, tags: next });
    } else {
      updateSongTags(songId, next);
    }
  };

  const allTags = Array.from(new Set(songs.flatMap((s) => s.tags))).sort();

  const filtered = songs.filter((s) => {
    const matchesTag = !activeTag || s.tags.includes(activeTag);
    const q = search.toLowerCase();
    const matchesSearch = !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    return matchesTag && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          Chord<span className="text-indigo-600">Sheet</span>
        </Link>
        <div className="w-px h-5 bg-zinc-200" />
        <h1 className="text-sm font-semibold text-zinc-900">My Songs</h1>
        <div className="flex-1" />
        {!isLoggedIn && (
          <Link
            href="/login"
            className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Sign in to sync
          </Link>
        )}
        <Link
          href="/editor/new"
          className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + New Song
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Search + tag filters */}
        <div className="flex flex-col gap-4 mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs…"
            className="w-full max-w-sm text-sm bg-white border border-zinc-200 rounded-lg px-4 py-2 outline-none focus:border-indigo-400 transition-colors"
          />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  !activeTag ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    activeTag === tag ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Song grid */}
        {loading ? (
          <div className="text-center py-24 text-zinc-300 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-zinc-400">
            {songs.length === 0 ? (
              <>
                <p className="text-base font-medium mb-2">No songs yet</p>
                <p className="text-sm mb-6">Create your first chord sheet to get started.</p>
                <Link href="/editor/new" className="text-sm bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                  + New Song
                </Link>
              </>
            ) : (
              <p className="text-sm">No songs match your filter.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((song) => {
              const encoded = encodeSong({ id: song.id, title: song.title, artist: song.artist, lines: song.lines });
              const editUrl = `/editor/new?song=${encoded}`;
              const viewUrl = `/view?song=${encoded}`;
              const isEditingTags = editingTagsId === song.id;

              return (
                <div key={song.id} className="group bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col">
                  <div className="flex-1 p-5">
                    <div className="text-base font-semibold text-zinc-900 truncate mb-0.5">
                      {song.title || "Untitled Song"}
                    </div>
                    <div className="text-sm text-zinc-400 truncate">
                      {song.artist || <span className="italic">No artist</span>}
                    </div>
                    <div className="text-xs text-zinc-300 mt-3">{timeAgo(song.updatedAt)}</div>
                  </div>

                  {/* Tags */}
                  <div className="px-5 pb-3">
                    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                      {song.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Tag editor */}
                  {isEditingTags && (
                    <div className="px-5 pb-4 border-t border-zinc-100 pt-3">
                      <p className="text-xs text-zinc-400 mb-2">Add tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_TAGS.map((tag) => {
                          const active = song.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => handleToggleTag(song.id, tag)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-zinc-500 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-1 px-4 py-2.5 border-t border-zinc-100">
                    <button
                      onClick={() => setEditingTagsId(isEditingTags ? null : song.id)}
                      className="text-xs text-zinc-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                    >
                      {isEditingTags ? "Done" : "# Tags"}
                    </button>
                    <div className="flex-1" />
                    <Link href={viewUrl} className="text-xs text-zinc-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                      View
                    </Link>
                    <Link href={editUrl} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors font-medium">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(song.id, song.source)}
                      className="text-xs text-zinc-300 hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
