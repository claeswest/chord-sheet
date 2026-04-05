"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { encodeSong } from "@/lib/songUrl";
import { fetchSongs, removeSong, duplicateSong, type DbSong } from "@/lib/songDb";
import { listSongs, deleteSong } from "@/lib/storage";
import {
  fetchCategories, createCategory, renameCategory, deleteCategory,
  addSongToCategory, removeSongFromCategory, type DbCategory,
} from "@/lib/categoryDb";

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

type Song = Omit<DbSong, "categoryIds"> & { source: "db" | "local"; categoryIds: string[] };

interface Props {
  isLoggedIn: boolean;
  userName?: string | null;
  userImage?: string | null;
}

export default function SongLibraryPage({ isLoggedIn, userName, userImage }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Category editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Drag and drop
  const [dragSongId, setDragSongId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isLoggedIn) {
          const [db, cats] = await Promise.all([fetchSongs(), fetchCategories()]);
          setSongs(db.map((s) => ({ ...s, categoryIds: s.categoryIds ?? [], source: "db" as const })));
          setCategories(cats);
        } else {
          const local = listSongs();
          setSongs(
            local.map((s) => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              lines: s.lines,
              tags: [],
              updatedAt: s.updatedAt,
              categoryIds: [],
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

  // ── Delete song ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, source: "db" | "local") => {
    if (source === "db") await removeSong(id);
    else deleteSong(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Duplicate song ───────────────────────────────────────────────────────────
  const handleDuplicate = async (song: Song) => {
    if (song.source !== "db") return;
    setDuplicatingId(song.id);
    try {
      const newSong = await duplicateSong(song);
      setSongs((prev) => [
        { ...newSong, categoryIds: newSong.categoryIds ?? [], source: "db" as const },
        ...prev,
      ]);
    } finally {
      setDuplicatingId(null);
    }
  };

  // ── Categories ───────────────────────────────────────────────────────────────
  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    setNewCategoryName("");
    setShowAddCategory(false);
    if (!name) return;
    const cat = await createCategory(name);
    setCategories((prev) => [...prev, cat]);
  };

  const startRename = (cat: DbCategory) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleRenameCategory = async (id: string) => {
    const name = editingCategoryName.trim();
    setEditingCategoryId(null);
    if (!name) return;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    await renameCategory(id, name);
  };

  const handleDeleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setSongs((prev) => prev.map((s) => ({ ...s, categoryIds: s.categoryIds.filter((cid) => cid !== id) })));
    if (selectedCategoryId === id) setSelectedCategoryId(null);
    await deleteCategory(id);
  };

  // ── Drag and drop ────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, songId: string) => {
    e.dataTransfer.setData("songId", songId);
    e.dataTransfer.effectAllowed = "move";
    setDragSongId(songId);
  };

  const handleDragEnd = () => {
    setDragSongId(null);
    setDragOverCategoryId(null);
  };

  const handleDrop = async (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    const songId = e.dataTransfer.getData("songId");
    setDragSongId(null);
    setDragOverCategoryId(null);
    if (!songId) return;
    const song = songs.find((s) => s.id === songId);
    if (!song || song.categoryIds.includes(categoryId)) return;
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, categoryIds: [...s.categoryIds, categoryId] } : s))
    );
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, songIds: [...c.songIds, songId] } : c))
    );
    await addSongToCategory(categoryId, songId);
  };

  const handleRemoveFromCategory = async (songId: string, categoryId: string) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, categoryIds: s.categoryIds.filter((id) => id !== categoryId) } : s))
    );
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, songIds: c.songIds.filter((id) => id !== songId) } : c))
    );
    await removeSongFromCategory(categoryId, songId);
  };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const uncategorizedCount = songs.filter((s) => s.categoryIds.length === 0).length;

  const filtered = songs.filter((s) => {
    if (selectedCategoryId === "uncategorized" && s.categoryIds.length > 0) return false;
    if (selectedCategoryId && selectedCategoryId !== "uncategorized" && !s.categoryIds.includes(selectedCategoryId)) return false;
    const q = search.toLowerCase();
    return !q || s.title.toLowerCase().includes(q) || (s.artist ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          Chord<span className="text-indigo-600">SheetCreator</span>
        </Link>
        <div className="w-px h-5 bg-zinc-200" />
        <h1 className="text-sm font-semibold text-zinc-900">My Songs</h1>
        <Link href="/pricing" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors hidden sm:block">
          Pricing
        </Link>
        <div className="flex-1" />
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <Link href="/account" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {userImage && (
                <img src={userImage} alt={userName ?? ""} className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm text-zinc-500 hidden sm:block">{userName}</span>
            </Link>
            <a
              href="/api/auth/signout"
              className="text-sm text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
            >
              Sign out
            </a>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Sign in to sync →
          </Link>
        )}
        <Link
          href="/editor/new"
          className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + New Song
        </Link>
      </header>

      <div className="flex flex-1">
        {/* Sidebar — logged-in users only */}
        {isLoggedIn && (
          <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 flex flex-col py-3">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex items-center justify-between px-4 py-2 text-sm w-full text-left transition-colors ${
                selectedCategoryId === null
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span>All Songs</span>
              <span className="text-xs text-zinc-400">{songs.length}</span>
            </button>

            <button
              onClick={() => setSelectedCategoryId("uncategorized")}
              className={`flex items-center justify-between px-4 py-2 text-sm w-full text-left transition-colors ${
                selectedCategoryId === "uncategorized"
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span>Uncategorized</span>
              <span className="text-xs text-zinc-400">{uncategorizedCount}</span>
            </button>

            {categories.length > 0 && <div className="h-px bg-zinc-100 mx-4 my-2" />}

            <div className="flex-1 overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCategoryId(cat.id); }}
                  onDragLeave={() => setDragOverCategoryId(null)}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  className={`group flex items-center gap-1 px-4 py-1.5 transition-colors ${
                    dragOverCategoryId === cat.id
                      ? "bg-indigo-50 ring-1 ring-inset ring-indigo-200"
                      : selectedCategoryId === cat.id
                      ? "bg-indigo-50"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  {editingCategoryId === cat.id ? (
                    <input
                      autoFocus
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameCategory(cat.id);
                        if (e.key === "Escape") setEditingCategoryId(null);
                      }}
                      onBlur={() => handleRenameCategory(cat.id)}
                      className="flex-1 text-sm bg-white border border-indigo-300 rounded px-2 py-0.5 outline-none min-w-0"
                    />
                  ) : (
                    <button
                      onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                      onDoubleClick={() => startRename(cat)}
                      className={`flex-1 text-left text-sm truncate min-w-0 ${
                        selectedCategoryId === cat.id ? "text-indigo-700 font-medium" : "text-zinc-600"
                      }`}
                      title="Double-click to rename"
                    >
                      {cat.name}
                    </button>
                  )}
                  <span className="text-xs text-zinc-300 shrink-0">{cat.songIds.length}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-400 transition-opacity shrink-0 text-base leading-none"
                    title="Delete category"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="px-3 pt-2 border-t border-zinc-100">
              {showAddCategory ? (
                <input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                    if (e.key === "Escape") { setShowAddCategory(false); setNewCategoryName(""); }
                  }}
                  onBlur={() => { if (newCategoryName.trim()) handleCreateCategory(); else setShowAddCategory(false); }}
                  placeholder="Category name…"
                  className="w-full text-sm bg-white border border-indigo-300 rounded px-2 py-1 outline-none"
                />
              ) : (
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="text-xs text-zinc-400 hover:text-indigo-600 py-1 transition-colors"
                >
                  + Add category
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 px-6 py-6 min-w-0">
          <div className="max-w-4xl">
            {/* Search */}
            <div className="mb-5">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search songs…"
                className="w-full max-w-sm text-sm bg-white border border-zinc-200 rounded-lg px-4 py-2 outline-none focus:border-indigo-400 transition-colors"
              />
            </div>

            {loading ? (
              <div className="text-center py-24 text-zinc-300 text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 text-zinc-400">
                {songs.length === 0 ? (
                  <>
                    <p className="text-base font-medium mb-2">No songs yet</p>
                    <p className="text-sm mb-6">Create your first chord sheet to get started.</p>
                    <Link
                      href="/editor/new"
                      className="text-sm bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      + New Song
                    </Link>
                  </>
                ) : (
                  <p className="text-sm">No songs match your filter.</p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                {filtered.map((song, idx) => {
                  const encoded = encodeSong({ id: song.id, title: song.title, artist: song.artist, lines: song.lines, style: song.style });
                  const editUrl = `/editor/new?song=${encoded}`;
                  const viewUrl = `/view?song=${encoded}`;
                  const isDuplicating = duplicatingId === song.id;

                  return (
                    <div
                      key={song.id}
                      draggable={isLoggedIn}
                      onDragStart={(e) => handleDragStart(e, song.id)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-50 ${
                        idx !== 0 ? "border-t border-zinc-100" : ""
                      } ${dragSongId === song.id ? "opacity-40" : ""}`}
                    >
                      {/* Drag handle */}
                      {isLoggedIn && (
                        <div className="text-zinc-200 group-hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors select-none text-xs leading-none">
                          ⠿
                        </div>
                      )}

                      {/* Title + artist — clicking opens view */}
                      <Link href={viewUrl} className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">
                          {song.title || "Untitled Song"}
                        </div>
                        {song.artist ? (
                          <div className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</div>
                        ) : null}
                      </Link>

                      {/* Category chips */}
                      {isLoggedIn && song.categoryIds.length > 0 && (
                        <div className="hidden sm:flex flex-wrap gap-1 shrink-0">
                          {song.categoryIds.map((catId) => {
                            const cat = categories.find((c) => c.id === catId);
                            if (!cat) return null;
                            return (
                              <span
                                key={catId}
                                className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full"
                              >
                                {cat.name}
                                <button
                                  onClick={() => handleRemoveFromCategory(song.id, catId)}
                                  className="text-zinc-400 hover:text-red-400 ml-0.5 leading-none"
                                  title={`Remove from ${cat.name}`}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Updated time */}
                      <div className="text-xs text-zinc-300 shrink-0 hidden md:block w-16 text-right">
                        {timeAgo(song.updatedAt)}
                      </div>

                      {/* Actions — visible on hover */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={viewUrl}
                          className="text-xs text-zinc-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={editUrl}
                          className="text-xs text-zinc-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                          Edit
                        </Link>
                        {song.source === "db" && (
                          <button
                            onClick={() => handleDuplicate(song)}
                            disabled={isDuplicating}
                            title="Duplicate"
                            className="text-xs text-zinc-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors disabled:opacity-40"
                          >
                            {isDuplicating ? "…" : "Copy"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(song.id, song.source)}
                          className="text-xs text-zinc-300 hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
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
        </main>
      </div>
    </div>
  );
}
