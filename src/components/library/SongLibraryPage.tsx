"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { encodeSong } from "@/lib/songUrl";
import { fetchSongs, removeSong, duplicateSong, reorderAllSongs, type DbSong } from "@/lib/songDb";
import { listSongs, deleteSong } from "@/lib/storage";
import {
  fetchCategories, createCategory, renameCategory, deleteCategory,
  addSongToCategory, removeSongFromCategory, reorderSongsInCategory, type DbCategory,
} from "@/lib/categoryDb";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// One palette entry per category slot — full Tailwind class strings so purging works
const CATEGORY_COLORS = [
  { chip: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-400" },
  { chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { chip: "bg-amber-100 text-amber-700",    dot: "bg-amber-400"  },
  { chip: "bg-rose-100 text-rose-700",      dot: "bg-rose-400"   },
  { chip: "bg-sky-100 text-sky-700",        dot: "bg-sky-400"    },
  { chip: "bg-violet-100 text-violet-700",  dot: "bg-violet-400" },
  { chip: "bg-orange-100 text-orange-700",  dot: "bg-orange-400" },
];

function getCatColor(catId: string, cats: DbCategory[]) {
  const idx = cats.findIndex((c) => c.id === catId);
  const i = ((idx < 0 ? 0 : idx) % CATEGORY_COLORS.length);
  return CATEGORY_COLORS[i];
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
  const [toast, setToast] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title" | "artist">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // desc = newest / A→Z default

  const handleSortClick = (opt: "date" | "title" | "artist") => {
    if (opt === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(opt);
      setSortDir(opt === "date" ? "desc" : "asc"); // natural defaults
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Category editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Drag and drop — category assignment
  const [dragSongId, setDragSongId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  // Drag and drop — reorder within category
  const [dragOverSongId, setDragOverSongId] = useState<string | null>(null);

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

    // Replace the default (full-width row) ghost with a compact pill so the
    // cursor sits at the left edge — much less distance to drag to the sidebar.
    const song = songs.find((s) => s.id === songId);
    const ghost = document.createElement("div");
    ghost.textContent = song ? `${song.title}` : "Song";
    ghost.style.cssText = [
      "position:fixed", "top:-999px", "left:-999px",
      "background:#4f46e5", "color:#fff",
      "padding:5px 12px", "border-radius:8px",
      "font-size:13px", "font-family:sans-serif",
      "white-space:nowrap", "pointer-events:none",
      "box-shadow:0 2px 8px rgba(0,0,0,0.25)",
    ].join(";");
    document.body.appendChild(ghost);
    // xOffset=8 keeps cursor just inside the left edge; yOffset centres vertically
    e.dataTransfer.setDragImage(ghost, 8, 16);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragEnd = () => {
    setDragSongId(null);
    setDragOverCategoryId(null);
    setDragOverSongId(null);
  };

  // Reorder songs — works for "All Songs" (selectedCategoryId === null) and named categories
  const handleDropOnSong = (e: React.DragEvent, targetSongId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSongId(null);
    const sourceSongId = e.dataTransfer.getData("songId");
    if (!sourceSongId || sourceSongId === targetSongId || selectedCategoryId === "uncategorized") return;

    if (selectedCategoryId === null) {
      // All Songs — compute the new order, update state and persist in one go
      const fromIdx = songs.findIndex((s) => s.id === sourceSongId);
      const toIdx = songs.findIndex((s) => s.id === targetSongId);
      if (fromIdx === -1 || toIdx === -1) return;
      const reordered = [...songs];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      setSongs(reordered);
      reorderAllSongs(reordered.map((s) => s.id))
        .then(() => showToast("Sort order saved"))
        .catch((err) => showToast(`Failed: ${err?.message ?? "unknown error"}`));
    } else {
      // Named category — use category's songIds as source of truth
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (!cat) return;

      const currentOrder = [...cat.songIds];
      const fromIdx = currentOrder.indexOf(sourceSongId);
      const toIdx = currentOrder.indexOf(targetSongId);
      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = currentOrder.splice(fromIdx, 1);
      currentOrder.splice(toIdx, 0, moved);

      setCategories((cats) => cats.map((c) =>
        c.id === selectedCategoryId ? { ...c, songIds: currentOrder } : c
      ));

      reorderSongsInCategory(selectedCategoryId, currentOrder)
        .then(() => showToast("Sort order saved"))
        .catch((err) => showToast(`Failed: ${err?.message ?? "unknown error"}`));
    }
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

  const filtered = songs
    .filter((s) => {
      if (selectedCategoryId === "uncategorized" && s.categoryIds.length > 0) return false;
      if (selectedCategoryId && selectedCategoryId !== "uncategorized" && !s.categoryIds.includes(selectedCategoryId)) return false;
      const q = search.toLowerCase();
      return !q || s.title.toLowerCase().includes(q) || (s.artist ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "title")  return dir * a.title.localeCompare(b.title);
      if (sortBy === "artist") return dir * (a.artist ?? "").localeCompare(b.artist ?? "");
      return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
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
      </header>

      <div className="flex flex-1">
        {/* Sidebar — logged-in users only */}
        {isLoggedIn && (
          <aside className="w-72 shrink-0 bg-white border-r border-zinc-200 flex flex-col py-3">
            <div className="px-3 pb-3">
              <Link
                href="/editor/new"
                className="flex items-center justify-center gap-1.5 w-full text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <span className="text-base leading-none">+</span> New Song
              </Link>
            </div>

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

            {categories.length > 0 && (
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Categories</span>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCategoryId(cat.id); }}
                  onDragLeave={(e) => {
                    // Only clear when the pointer actually leaves this element,
                    // not when it moves over a child element inside it.
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverCategoryId(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  className={`group flex items-center gap-1 px-4 transition-all duration-100 ${
                    dragSongId ? "py-3" : "py-1.5"
                  } ${
                    dragOverCategoryId === cat.id
                      ? "bg-indigo-100 ring-2 ring-inset ring-indigo-400"
                      : dragSongId
                      ? "bg-indigo-50/60 ring-1 ring-inset ring-indigo-100"
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
                      className={`flex-1 flex items-center gap-2 text-left text-sm truncate min-w-0 ${
                        selectedCategoryId === cat.id ? "text-indigo-700 font-medium" : "text-zinc-600"
                      }`}
                      title="Double-click to rename"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getCatColor(cat.id, categories).dot}`} />
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
            {/* Search + sort + count */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search songs…"
                className="w-full max-w-xs text-sm bg-white border border-zinc-200 rounded-lg px-4 py-2 outline-none focus:border-indigo-400 transition-colors"
              />
              {!loading && (
                <div className="flex items-center gap-1 shrink-0">
                  {(["date", "title", "artist"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSortClick(opt)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                        sortBy === opt
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {opt === "date" ? "Recent" : opt === "title" ? "Title" : "Artist"}
                      {sortBy === opt && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          {sortDir === "asc"
                            ? <path d="M12 8l-6 6h12l-6-6Z"/>
                            : <path d="M12 16l6-6H6l6 6Z"/>}
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1" />
              {!loading && (
                <span className="text-sm text-zinc-400 shrink-0">
                  {filtered.length} {filtered.length === 1 ? "song" : "songs"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-5">
                {/* Three bouncing musical notes */}
                <div className="flex items-end gap-3">
                  {[0, 1, 2].map((i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-7 h-7 text-indigo-300"
                      style={{
                        animation: "noteJump 1.1s ease-in-out infinite",
                        animationDelay: `${i * 0.18}s`,
                      }}
                    >
                      <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9Z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-zinc-400 tracking-wide">Loading your songs…</span>
                <style>{`
                  @keyframes noteJump {
                    0%, 100% { transform: translateY(0); opacity: 0.5; }
                    40%       { transform: translateY(-10px); opacity: 1; }
                    60%       { transform: translateY(-6px); opacity: 0.9; }
                  }
                `}</style>
              </div>
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

                  const titleColor = song.style?.title?.color ?? "#18181b";
                  const artistColor = song.style?.artist?.color ?? "#a1a1aa";
                  const rowBg = song.style?.background;

                  const isReorderTarget = dragOverSongId === song.id && selectedCategoryId !== "uncategorized";

                  return (
                    <div
                      key={song.id}
                      draggable={isLoggedIn}
                      onDragStart={(e) => handleDragStart(e, song.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (selectedCategoryId !== "uncategorized" && dragSongId && dragSongId !== song.id) {
                          setDragOverSongId(song.id);
                        }
                      }}
                      onDragLeave={() => setDragOverSongId(null)}
                      onDrop={(e) => handleDropOnSong(e, song.id)}
                      className={`group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-50 ${
                        idx !== 0 ? "border-t border-zinc-100" : ""
                      } ${dragSongId === song.id ? "opacity-40" : ""} ${
                        isReorderTarget ? "ring-2 ring-inset ring-indigo-400" : ""
                      }`}
                    >
                      {/* Drag handle */}
                      {isLoggedIn && (
                        <div className="text-zinc-200 group-hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors select-none text-xs leading-none">
                          ⠿
                        </div>
                      )}

                      {/* Title + artist — background color applied only here */}
                      <Link href={viewUrl} className="flex-1 min-w-0">
                        <div
                          className="block rounded px-2 py-1 -mx-2 -my-1"
                          style={{ backgroundColor: rowBg ?? undefined }}
                        >
                          <div
                            className="text-sm font-medium truncate"
                            style={{ color: titleColor }}
                          >
                            {song.title || "Untitled Song"}
                          </div>
                          {song.artist ? (
                            <div
                              className="text-xs truncate mt-0.5"
                              style={{ color: artistColor }}
                            >
                              {song.artist}
                            </div>
                          ) : null}
                        </div>
                      </Link>

                      {/* Category chips — fixed width so title pill is always the same width */}
                      {isLoggedIn && (
                        <div className="hidden sm:flex flex-wrap gap-1 w-36 shrink-0">
                        {song.categoryIds.map((catId) => {
                            const cat = categories.find((c) => c.id === catId);
                            if (!cat) return null;
                            const color = getCatColor(catId, categories);
                            return (
                              <span
                                key={catId}
                                className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${color.chip}`}
                              >
                                {cat.name}
                                <button
                                  onClick={() => handleRemoveFromCategory(song.id, catId)}
                                  className="opacity-60 hover:opacity-100 ml-0.5 leading-none transition-opacity"
                                  title={`Remove from ${cat.name}`}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Updated date */}
                      <div className="text-xs text-zinc-300 shrink-0 hidden md:block text-right">
                        {formatDate(song.updatedAt)}
                      </div>

                      {/* Actions — icon buttons, visible on hover */}
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* View */}
                        <Link href={viewUrl} title="View"
                          className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
                          </svg>
                        </Link>
                        {/* Edit */}
                        <Link href={editUrl} title="Edit"
                          className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.08a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                          </svg>
                        </Link>
                        {/* Duplicate */}
                        {song.source === "db" && (
                          <button onClick={() => handleDuplicate(song)} disabled={isDuplicating}
                            title="Duplicate"
                            className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-30">
                            {isDuplicating ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 animate-spin">
                                <path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>
                              </svg>
                            )}
                          </button>
                        )}
                        {/* Remove from category */}
                        {selectedCategoryId && selectedCategoryId !== "uncategorized" && (
                          <button onClick={() => handleRemoveFromCategory(song.id, selectedCategoryId)}
                            title="Remove from this category"
                            className="p-1.5 rounded text-zinc-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-4 8H8v-2h8v2Z"/>
                            </svg>
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => handleDelete(song.id, song.source)}
                          title="Delete song permanently"
                          className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/>
                          </svg>
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

      {/* Toast notification */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all duration-300 pointer-events-none ${
          toast ? "opacity-100 translate-y-0 bg-zinc-800 text-white" : "opacity-0 translate-y-2"
        }`}
      >
        {toast}
      </div>
    </div>
  );
}
