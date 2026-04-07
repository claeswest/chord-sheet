"use client";

import { useEffect, useRef, useState } from "react";
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
  { chip: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-400",  accent: "bg-indigo-300",  sidebarSelected: "border-l-indigo-400"  },
  { chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", accent: "bg-emerald-400", sidebarSelected: "border-l-emerald-500" },
  { chip: "bg-amber-100 text-amber-700",    dot: "bg-amber-400",   accent: "bg-amber-300",   sidebarSelected: "border-l-amber-400"   },
  { chip: "bg-rose-100 text-rose-700",      dot: "bg-rose-400",    accent: "bg-rose-300",    sidebarSelected: "border-l-rose-400"    },
  { chip: "bg-sky-100 text-sky-700",        dot: "bg-sky-400",     accent: "bg-sky-300",     sidebarSelected: "border-l-sky-400"     },
  { chip: "bg-violet-100 text-violet-700",  dot: "bg-violet-400",  accent: "bg-violet-300",  sidebarSelected: "border-l-violet-400"  },
  { chip: "bg-orange-100 text-orange-700",  dot: "bg-orange-400",  accent: "bg-orange-300",  sidebarSelected: "border-l-orange-400"  },
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
  const [sortBy, setSortBy] = useState<"date" | "title" | "artist" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const searchRef   = useRef<HTMLInputElement>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Switch category and clear any active sort
  const selectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setSortBy(null);
  };

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

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // "/" focuses the search box (like GitHub / Linear / Notion)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // already typing
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      // No sort active — natural order (drag order for named categories, server order otherwise)
      if (!sortBy) {
        if (selectedCategoryId && selectedCategoryId !== "uncategorized") {
          const cat = categories.find((c) => c.id === selectedCategoryId);
          if (cat) {
            return (cat.songIds.indexOf(a.id) ?? 999) - (cat.songIds.indexOf(b.id) ?? 999);
          }
        }
        return 0;
      }
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "title")  return dir * a.title.localeCompare(b.title);
      if (sortBy === "artist") return dir * (a.artist ?? "").localeCompare(b.artist ?? "");
      return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#302b63] border-b border-white/10 px-6 py-3 flex items-center shrink-0">
        <Link href="/" className="text-sm font-bold tracking-tight text-white">
          Chord<span className="text-indigo-400">SheetCreator</span>
        </Link>
        <div className="flex-1" />
        {isLoggedIn ? (
          /* Avatar dropdown */
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors"
            >
              {userImage
                ? <img src={userImage} alt={userName ?? ""} className="w-7 h-7 rounded-full ring-1 ring-white/20" />
                : <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">{userName?.[0]}</div>
              }
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                className={`w-3.5 h-3.5 text-white/40 transition-transform ${showUserMenu ? "rotate-180" : ""}`}>
                <path d="M12 16l-6-6h12l-6 6Z"/>
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-zinc-200 py-1.5 z-50">
                {/* Name — non-clickable label */}
                <div className="px-3 py-2 border-b border-zinc-100 mb-1">
                  <p className="text-xs font-medium text-zinc-800 truncate">{userName}</p>
                </div>
                <Link href="/account" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400">
                    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z"/>
                  </svg>
                  Account
                </Link>
                <Link href="/pricing" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4Z"/>
                  </svg>
                  Pricing
                </Link>
                <div className="border-t border-zinc-100 mt-1 pt-1">
                  <a href="/api/auth/signout"
                    className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4ZM5 5h7V3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h7v-2H5V5Z"/>
                    </svg>
                    Sign out
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login"
            className="text-sm text-indigo-300 font-medium hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            Sign in to sync →
          </Link>
        )}
      </header>

      <div className="flex flex-1">
        {/* Sidebar — logged-in users only */}
        {isLoggedIn && (
          <aside className="w-96 shrink-0 bg-[#302b63] border-r border-white/10 flex flex-col py-3">
            <div className="px-3 pb-3">
              <Link
                href="/editor/new"
                className="flex items-center justify-center gap-1.5 w-full text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <span className="text-base leading-none">+</span> New Song
              </Link>
            </div>

            <button
              onClick={() => selectCategory(null)}
              className={`flex items-center justify-between pl-3 pr-4 py-2 text-sm w-full text-left transition-colors border-l-4 ${
                selectedCategoryId === null
                  ? "bg-white/10 text-white font-semibold border-l-indigo-400"
                  : "text-white/60 hover:bg-white/10 border-l-transparent"
              }`}
            >
              <span>All Songs</span>
              <span className="text-xs bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">{songs.length}</span>
            </button>

            <button
              onClick={() => selectCategory("uncategorized")}
              className={`flex items-center justify-between pl-3 pr-4 py-2 text-sm w-full text-left transition-colors border-l-4 ${
                selectedCategoryId === "uncategorized"
                  ? "bg-white/10 text-white font-semibold border-l-indigo-400"
                  : "text-white/60 hover:bg-white/10 border-l-transparent"
              }`}
            >
              <span>Uncategorized</span>
              <span className="text-xs bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">{uncategorizedCount}</span>
            </button>

            {categories.length > 0 && (
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/30">Categories</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto pb-2">
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
                  className={`group flex items-center gap-1 pl-3 pr-4 transition-all duration-100 border-l-4 ${
                    dragSongId ? "py-3" : "py-1.5"
                  } ${
                    dragOverCategoryId === cat.id
                      ? "bg-indigo-500/30 ring-2 ring-inset ring-indigo-400 border-l-transparent"
                      : dragSongId
                      ? "bg-white/5 ring-1 ring-inset ring-white/10 border-l-transparent"
                      : selectedCategoryId === cat.id
                      ? `bg-white/10 ${getCatColor(cat.id, categories).sidebarSelected}`
                      : "hover:bg-white/10 border-l-transparent"
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
                      className="flex-1 text-sm bg-white/10 border border-indigo-400/60 rounded px-2 py-0.5 outline-none min-w-0 text-white placeholder:text-white/30"
                    />
                  ) : (
                    <button
                      onClick={() => selectCategory(cat.id === selectedCategoryId ? null : cat.id)}
                      onDoubleClick={() => startRename(cat)}
                      className={`flex-1 flex items-center gap-2 text-left text-sm truncate min-w-0 ${
                        selectedCategoryId === cat.id ? "text-white font-medium" : "text-white/60"
                      }`}
                      title="Double-click to rename"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getCatColor(cat.id, categories).dot}`} />
                      {cat.name}
                    </button>
                  )}
                  <span className="text-xs bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full shrink-0">{cat.songIds.length}</span>
                  {/* Rename */}
                  <button
                    onClick={() => startRename(cat)}
                    className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-indigo-300 transition-opacity shrink-0"
                    title="Rename category"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.08a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-opacity shrink-0 text-base leading-none"
                    title="Delete category"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add category — sits directly below the last category */}
              <div className="px-4 pt-1">
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
                    className="w-full text-sm bg-white/10 border border-indigo-400/60 rounded px-2 py-1 outline-none text-white placeholder:text-white/30"
                  />
                ) : (
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="text-xs text-white/35 hover:text-indigo-300 py-1.5 transition-colors"
                  >
                    + Add category
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 px-6 py-6 min-w-0">
          <div className="max-w-4xl">
            {/* Search + sort + count — sticky so it stays visible while scrolling */}
            <div className="sticky top-0 z-10 bg-white pt-1 pb-4 flex items-center gap-3 flex-wrap -mx-6 px-6">
              <input
                ref={searchRef}
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
              {/* List / Grid toggle */}
              {!loading && (
                <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 shrink-0">
                  <button onClick={() => setViewMode("list")} title="List view"
                    className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-zinc-100 text-zinc-700" : "text-zinc-400 hover:text-zinc-600"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M3 13h2v-2H3v2Zm0 4h2v-2H3v2Zm0-8h2V7H3v2Zm4 4h14v-2H7v2Zm0 4h14v-2H7v2ZM7 7v2h14V7H7Z"/>
                    </svg>
                  </button>
                  <button onClick={() => setViewMode("grid")} title="Card view"
                    className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-zinc-100 text-zinc-700" : "text-zinc-400 hover:text-zinc-600"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M3 3h8v8H3V3Zm0 10h8v8H3v-8Zm10-10h8v8h-8V3Zm0 10h8v8h-8v-8Z"/>
                    </svg>
                  </button>
                </div>
              )}
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
                  /* Library is totally empty */
                  <>
                    <p className="text-base font-medium mb-2">No songs yet</p>
                    <p className="text-sm mb-6">Create your first chord sheet to get started.</p>
                    <Link href="/editor/new"
                      className="text-sm bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                      + New Song
                    </Link>
                  </>
                ) : selectedCategoryId && selectedCategoryId !== "uncategorized" && !search ? (
                  /* Named category is empty — show drag hint */
                  (() => {
                    const catName = categories.find((c) => c.id === selectedCategoryId)?.name ?? "this category";
                    return (
                      <div className="flex flex-col items-center gap-4">
                        {/* Drag illustration */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 48" fill="none" className="w-20 h-12 text-zinc-200">
                          {/* Song pill on the right */}
                          <rect x="44" y="10" width="32" height="14" rx="7" fill="currentColor"/>
                          <rect x="48" y="14" width="16" height="3" rx="1.5" fill="white" opacity="0.7"/>
                          <rect x="48" y="19" width="10" height="2" rx="1" fill="white" opacity="0.5"/>
                          {/* Arrow pointing left */}
                          <path d="M38 17 L14 17 M14 17 L20 12 M14 17 L20 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          {/* Target folder/category on the left */}
                          <rect x="2" y="8" width="10" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                          <rect x="2" y="14" width="10" height="8" rx="2" fill="currentColor" opacity="0.8"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-zinc-500">No songs in <span className="text-zinc-700">"{catName}"</span> yet</p>
                          <p className="text-xs mt-1 text-zinc-400">Drag a song from the list here, or pick a song and drop it onto this category in the sidebar.</p>
                        </div>
                      </div>
                    );
                  })()
                ) : search ? (
                  /* Search returned nothing */
                  <p className="text-sm">No songs match <span className="font-medium text-zinc-600">"{search}"</span></p>
                ) : (
                  <p className="text-sm">No songs match your filter.</p>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* ── Card / Grid view ─────────────────────────────────────── */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((song) => {
                  const encoded = encodeSong({ id: song.id, title: song.title, artist: song.artist, lines: song.lines, style: song.style });
                  const editUrl = `/editor/new?song=${encoded}`;
                  const viewUrl = `/view?song=${encoded}`;
                  const isDuplicating = duplicatingId === song.id;
                  const titleColor = song.style?.title?.color ?? "#18181b";
                  const artistColor = song.style?.artist?.color ?? "#71717a";
                  const cardBg = song.style?.background;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const firstChord = (song.lines as any[])?.find((l) => l.chords?.length > 0)?.chords?.[0]?.chord ?? null;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const chordCount = (song.lines as any[])?.reduce((n: number, l: any) => n + (l.chords?.length ?? 0), 0) ?? 0;

                  return (
                    <div
                      key={song.id}
                      draggable={isLoggedIn}
                      onDragStart={(e) => handleDragStart(e, song.id)}
                      onDragEnd={handleDragEnd}
                      className={`group relative rounded-xl border border-zinc-200 overflow-hidden bg-white hover:shadow-md transition-all ${
                        dragSongId === song.id ? "opacity-40" : ""
                      }`}
                    >
                      {/* Coloured top area */}
                      <Link href={viewUrl} className="block">
                        <div
                          className="px-4 pt-4 pb-5 min-h-[88px]"
                          style={cardBg
                            ? { backgroundColor: cardBg }
                            : { background: "linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%)" }}
                        >
                          <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: titleColor }}>
                            {song.title || "Untitled Song"}
                          </p>
                          {song.artist && (
                            <p className="text-xs mt-1 truncate" style={{ color: artistColor }}>
                              {song.artist}
                            </p>
                          )}
                        </div>
                      </Link>

                      {/* Meta bar */}
                      <div className="px-3 py-2 border-t border-zinc-100 flex items-center gap-2 flex-wrap min-h-[36px]">
                        {firstChord && (
                          <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium">{firstChord}</span>
                        )}
                        {chordCount > 0 && (
                          <span className="text-xs text-zinc-400">{chordCount} chords</span>
                        )}
                        <div className="flex-1" />
                        {/* Category colour dots */}
                        <div className="flex gap-0.5">
                          {song.categoryIds.slice(0, 4).map((catId) => (
                            <span key={catId} className={`w-2 h-2 rounded-full shrink-0 ${getCatColor(catId, categories).dot}`} />
                          ))}
                        </div>
                      </div>

                      {/* Hover action overlay — top-right corner */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={editUrl} title="Edit"
                          className="p-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm text-zinc-500 hover:text-indigo-600 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.08a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                          </svg>
                        </Link>
                        {song.source === "db" && (
                          <button onClick={() => handleDuplicate(song)} disabled={isDuplicating} title="Duplicate"
                            className="p-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm text-zinc-500 hover:text-indigo-600 transition-colors disabled:opacity-30">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>
                            </svg>
                          </button>
                        )}
                        <button onClick={() => handleDelete(song.id, song.source)} title="Delete permanently"
                          className="p-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm text-zinc-500 hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── List view (default) ──────────────────────────────────── */
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                {filtered.map((song, idx) => {
                  const encoded = encodeSong({ id: song.id, title: song.title, artist: song.artist, lines: song.lines, style: song.style });
                  const editUrl = `/editor/new?song=${encoded}`;
                  const viewUrl = `/view?song=${encoded}`;
                  const isDuplicating = duplicatingId === song.id;

                  const titleColor = song.style?.title?.color ?? "#18181b";
                  const artistColor = song.style?.artist?.color ?? "#71717a";
                  const rowBg = song.style?.background;

                  const isReorderTarget = dragOverSongId === song.id && selectedCategoryId !== "uncategorized";
                  const firstCatAccent = song.categoryIds[0] ? getCatColor(song.categoryIds[0], categories).accent : null;

                  // Quick-info stats (computed once per row)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const allLines = (song.lines as any[]) ?? [];
                  const lyricLines = allLines.filter((l) => l.type === "lyric");
                  const lineCount  = lyricLines.length;
                  const chordCount = allLines.reduce((n: number, l: any) => n + (l.chords?.length ?? 0), 0);
                  const wordCount  = lyricLines.reduce((n: number, l: any) => {
                    const t = (l.text ?? "").trim();
                    return n + (t ? t.split(/\s+/).length : 0);
                  }, 0);
                  const firstChord = allLines.find((l: any) => l.chords?.length > 0)?.chords?.[0]?.chord ?? null;

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
                      className={`group relative flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-indigo-50/30 ${
                        idx !== 0 ? "border-t border-zinc-100" : ""
                      } ${dragSongId === song.id ? "opacity-40" : ""} ${
                        isReorderTarget ? "ring-2 ring-inset ring-indigo-400" : ""
                      }`}
                    >
                      {/* Left-edge accent bar — song colour takes priority over category colour */}
                      {rowBg ? (
                        <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: rowBg }} />
                      ) : firstCatAccent ? (
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${firstCatAccent}`} />
                      ) : null}

                      {/* Drag handle */}
                      {isLoggedIn && (
                        <div className="text-zinc-200 group-hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors select-none text-xs leading-none">
                          ⠿
                        </div>
                      )}

                      {/* Title + artist */}
                      <Link href={viewUrl} className="flex-1 min-w-0">
                        <div className="block">
                          <div
                            className="text-sm font-semibold truncate"
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

                      {/* Date ↔ quick-info (swaps on row hover) */}
                      <div className="relative shrink-0 hidden md:flex items-center justify-end w-44">
                        {/* Date — fades out on hover */}
                        <span className="text-xs text-zinc-400 group-hover:opacity-0 transition-opacity whitespace-nowrap">
                          {formatDate(song.updatedAt)}
                        </span>
                        {/* Stats — fades in on hover */}
                        <div className="absolute right-0 inset-y-0 flex flex-col items-end justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="text-xs text-zinc-500 whitespace-nowrap">
                            {lineCount} lines · {chordCount} chords · {wordCount} words
                          </span>
                          {firstChord && (
                            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium self-end">
                              {firstChord}
                            </span>
                          )}
                        </div>
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
