"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import WelcomeModal from "./WelcomeModal";
import GuestImportBanner from "./GuestImportBanner";
import { encodeSong } from "@/lib/songUrl";
import { fetchSongs, removeSong, duplicateSong, reorderAllSongs, type DbSong } from "@/lib/songDb";
import { listSongs, deleteSong } from "@/lib/storage";
import {
  fetchCategories, createCategory, renameCategory, deleteCategory,
  addSongToCategory, removeSongFromCategory, reorderSongsInCategory, reorderCategories, type DbCategory,
} from "@/lib/categoryDb";
import LoadingNotes from "@/components/ui/LoadingNotes";
import ScrollToTop from "@/components/ui/ScrollToTop";
import UserMenu from "@/components/ui/UserMenu";

/** Returns true if a hex colour is dark (luminance < 0.18) */
function isDarkColour(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  // Relative luminance (WCAG formula)
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance < 0.18;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  const searchParams = useSearchParams();
  const forceWelcome = searchParams.get("welcome") === "1";

  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [importBannerKey, setImportBannerKey] = useState(0); // bump to re-evaluate after import
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title" | "artist" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; source: "db" | "local" } | null>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [searchBarStuck, setSearchBarStuck] = useState(false);

  // Switch category and clear any active sort; close sidebar on mobile
  const selectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setSortBy(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
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
  const [showAddSubCategory, setShowAddSubCategory] = useState<string | null>(null); // parentId
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) =>
    setCollapsedCategories((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // Drag and drop — category assignment
  const [dragSongId, setDragSongId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  // Drag and drop — reorder within category
  const [dragOverSongId, setDragOverSongId] = useState<string | null>(null);

  // Drag and drop — reorder categories
  const [dragCatId, setDragCatId] = useState<string | null>(null);
  const [dragOverCatReorderId, setDragOverCatReorderId] = useState<string | null>(null);
  const touchCatDragRef = useRef<{ catId: string; startY: number } | null>(null);

  // Expanded row menu (small screens)
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [catPickerSongId, setCatPickerSongId] = useState<string | null>(null);

  // Sidebar open/close — hidden by default on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  // Ensure drag highlight never gets stuck if the browser skips onDragEnd
  useEffect(() => {
    const clear = () => { setDragSongId(null); setDragOverSongId(null); setDragOverCategoryId(null); };
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    return () => { window.removeEventListener("dragend", clear); window.removeEventListener("drop", clear); };
  }, []);

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

  // ── Detect when search bar is stuck (scrolled past sentinel) ─────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSearchBarStuck(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

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

  const handleCreateSubCategory = async (parentId: string) => {
    const name = newSubCategoryName.trim();
    setNewSubCategoryName("");
    setShowAddSubCategory(null);
    if (!name) return;
    const cat = await createCategory(name, parentId);
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
    // Collect the category + all its children so local state stays consistent
    const childIds = categories.filter((c) => c.parentId === id).map((c) => c.id);
    const allIds = [id, ...childIds];
    setCategories((prev) => prev.filter((c) => !allIds.includes(c.id)));
    setSongs((prev) => prev.map((s) => ({ ...s, categoryIds: s.categoryIds.filter((cid) => !allIds.includes(cid)) })));
    if (selectedCategoryId && allIds.includes(selectedCategoryId)) setSelectedCategoryId(null);
    await deleteCategory(id); // DB cascade removes children automatically
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
    if (!sourceSongId || sourceSongId === targetSongId) return;

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

  const handleCatReorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setCategories((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((c) => c.id === fromId);
      const toIdx = next.findIndex((c) => c.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    // Compute new order outside the updater and persist it
    const next = [...categories];
    const fromIdx = next.findIndex((c) => c.id === fromId);
    const toIdx = next.findIndex((c) => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    reorderCategories(next.map((c) => c.id));
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
  // When a parent category is selected, also include songs from its subcategories
  const selectedChildIds = selectedCategoryId
    ? categories.filter((c) => c.parentId === selectedCategoryId).map((c) => c.id)
    : [];

  const filtered = songs
    .filter((s) => {
      if (selectedCategoryId) {
        const inSelected = s.categoryIds.includes(selectedCategoryId);
        const inChild = selectedChildIds.some((id) => s.categoryIds.includes(id));
        if (!inSelected && !inChild) return false;
      }
      const q = search.toLowerCase();
      return !q || s.title.toLowerCase().includes(q) || (s.artist ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // No sort active — natural order (drag order for named categories, server order otherwise)
      if (!sortBy) {
        if (selectedCategoryId) {
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
      {/* Welcome modal — shown when library is empty OR when landing via ?welcome=1 */}
      {!loading && (forceWelcome || songs.length === 0) && !welcomeDismissed && (
        <WelcomeModal onDismiss={() => setWelcomeDismissed(true)} />
      )}

      {/* Header */}
      <header className="bg-[#302b63] border-b border-white/10 px-4 h-14 flex items-center gap-3 shrink-0">
        {isLoggedIn && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z"/>
            </svg>
          </button>
        )}
        <Link href="/" className="text-sm font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-nunito)" }}>
          ChordSheet<span className="text-indigo-400">Maker</span>
        </Link>
        <div className="flex-1" />
        {isLoggedIn
          ? <UserMenu userName={userName} userImage={userImage} />
          : <Link href="/login" className="text-sm font-medium px-4 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">Sign in</Link>
        }
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — full-screen overlay on mobile, inline on desktop */}
        <aside className={`shrink-0 bg-[#302b63] border-r border-white/10 flex flex-col py-3 overflow-hidden transition-all duration-200
          ${sidebarOpen
            ? "fixed inset-0 z-40 w-full overflow-y-auto overscroll-contain lg:relative lg:inset-auto lg:z-auto lg:w-64 xl:lg:w-80 lg:overflow-hidden"
            : "w-0 py-0 border-r-0 lg:w-0"
          }`}>
        {isLoggedIn ? (<>
            {/* Mobile close button */}
            <div className="lg:hidden flex items-center justify-between px-4 pb-3 border-b border-white/10 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Categories</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => selectCategory(null)}
              className={`flex items-center gap-2 pl-3 pr-4 py-1.5 text-sm w-full text-left transition-colors border-l-4 ${
                selectedCategoryId === null
                  ? "bg-white/20 text-white font-semibold border-l-indigo-300"
                  : "text-white/60 hover:bg-white/10 border-l-transparent"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0 bg-white/30" />
              <span className="flex-1">All Songs</span>
              <span className="text-xs bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full shrink-0">{songs.length}</span>
            </button>

            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/30">Categories</span>
            </div>


            <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
              {/* Render parent categories, each followed by their subcategories */}
              {categories.filter((c) => !c.parentId).map((cat) => {
                const children = categories.filter((c) => c.parentId === cat.id);
                // Count: songs directly in parent + songs in any child
                const allChildIds = children.map((c) => c.id);
                const totalCount = songs.filter((s) =>
                  s.categoryIds.includes(cat.id) || allChildIds.some((cid) => s.categoryIds.includes(cid))
                ).length;

                return (
                  <div key={cat.id}>
                    {/* Parent category row */}
                    <div
                      data-cat-id={cat.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragCatId && dragCatId !== cat.id) { setDragOverCatReorderId(cat.id); return; }
                        setDragOverCategoryId(cat.id);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverCategoryId(null);
                          setDragOverCatReorderId(null);
                        }
                      }}
                      onDrop={(e) => {
                        if (dragCatId) { handleCatReorder(dragCatId, cat.id); setDragCatId(null); setDragOverCatReorderId(null); return; }
                        handleDrop(e, cat.id);
                      }}
                      className={`group flex items-center gap-1 pl-3 pr-2 transition-all duration-100 border-l-4 ${
                        dragSongId ? "py-3" : "py-1.5"
                      } ${
                        dragOverCatReorderId === cat.id
                          ? "bg-white/20 ring-2 ring-inset ring-white/40 border-l-transparent"
                          : dragOverCategoryId === cat.id
                          ? "bg-indigo-500/30 ring-2 ring-inset ring-indigo-400 border-l-transparent"
                          : dragSongId
                          ? "bg-white/5 ring-1 ring-inset ring-white/10 border-l-transparent"
                          : dragCatId === cat.id
                          ? "opacity-40 border-l-transparent"
                          : selectedCategoryId === cat.id
                          ? `bg-white/20 ${getCatColor(cat.id, categories).sidebarSelected}`
                          : "hover:bg-white/10 border-l-transparent"
                      }`}
                    >
                      {editingCategoryId === cat.id ? (
                        <input autoFocus value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory(cat.id); if (e.key === "Escape") setEditingCategoryId(null); }}
                          onBlur={() => handleRenameCategory(cat.id)}
                          className="flex-1 text-sm bg-white/10 border border-indigo-400/60 rounded px-2 py-0.5 outline-none min-w-0 text-white placeholder:text-white/30"
                        />
                      ) : (
                        <>
                          {/* Category drag handle */}
                          <span
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; setDragCatId(cat.id); }}
                            onDragEnd={() => { setDragCatId(null); setDragOverCatReorderId(null); }}
                            onTouchStart={(e) => { touchCatDragRef.current = { catId: cat.id, startY: e.touches[0].clientY }; }}
                            onTouchMove={(e) => {
                              if (!touchCatDragRef.current) return;
                              e.preventDefault();
                              setDragCatId(touchCatDragRef.current.catId);
                              const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
                              const row = el?.closest("[data-cat-id]");
                              const overId = row?.getAttribute("data-cat-id") ?? null;
                              setDragOverCatReorderId(overId !== touchCatDragRef.current.catId ? overId : null);
                            }}
                            onTouchEnd={() => {
                              if (touchCatDragRef.current && dragOverCatReorderId) {
                                handleCatReorder(touchCatDragRef.current.catId, dragOverCatReorderId);
                              }
                              touchCatDragRef.current = null;
                              setDragCatId(null);
                              setDragOverCatReorderId(null);
                            }}
                            className="shrink-0 text-white/20 hover:text-white/60 sm:opacity-0 sm:group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-all select-none text-sm leading-none px-0.5"
                            title="Drag to reorder"
                          >⠿</span>
                          <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                            {children.length > 0 && (
                              <button onClick={() => toggleCollapse(cat.id)} className="text-white/60 hover:text-white transition-colors" title={collapsedCategories.has(cat.id) ? "Expand" : "Collapse"}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 transition-transform duration-150 ${collapsedCategories.has(cat.id) ? "-rotate-90" : ""}`}><path d="M7 10l5 5 5-5H7Z"/></svg>
                              </button>
                            )}
                          </span>
                          <button
                            onClick={() => selectCategory(cat.id === selectedCategoryId ? null : cat.id)}
                            onDoubleClick={() => startRename(cat)}
                            className={`flex-1 flex items-center gap-2 text-left text-sm truncate min-w-0 ${selectedCategoryId === cat.id ? "text-white font-semibold" : "text-white/60"}`}
                            title="Double-click to rename"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${getCatColor(cat.id, categories).dot}`} />
                            {cat.name}
                          </button>
                        </>
                      )}
                      {/* Add subcategory */}
                      <button onClick={() => { setShowAddSubCategory(cat.id); setNewSubCategoryName(""); }}
                        className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-indigo-300 transition-opacity shrink-0 ml-0.5"
                        title="Add subcategory">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z"/></svg>
                      </button>
                      {/* Rename */}
                      <button onClick={() => startRename(cat)}
                        className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-indigo-300 transition-opacity shrink-0"
                        title="Rename">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.08a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>
                      </button>
                      {/* Delete */}
                      <button onClick={() => handleDeleteCategory(cat.id)}
                        className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-opacity shrink-0 text-base leading-none"
                        title="Delete">×</button>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 tabular-nums min-w-[1.5rem] text-center bg-white/10 text-white/50`}>{totalCount}</span>
                    </div>

                    {/* Subcategory rows + add input — wrapped in a tree-line container */}
                    {!collapsedCategories.has(cat.id) && (children.length > 0 || showAddSubCategory === cat.id) && (
                      <div className="ml-9 border-l border-white/20 mb-2">
                        {children.map((sub) => (
                          <div key={sub.id}
                            onDragOver={(e) => { e.preventDefault(); setDragOverCategoryId(sub.id); }}
                            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCategoryId(null); }}
                            onDrop={(e) => handleDrop(e, sub.id)}
                            className={`group flex items-center gap-1 pl-4 pr-2 transition-all duration-100 ${
                              dragSongId ? "py-2" : "py-1"
                            } ${
                              dragOverCategoryId === sub.id
                                ? "bg-indigo-500/30 ring-2 ring-inset ring-indigo-400"
                                : dragSongId
                                ? "bg-white/5 ring-1 ring-inset ring-white/10"
                                : selectedCategoryId === sub.id
                                ? "bg-white/15"
                                : "hover:bg-white/10"
                            }`}
                          >
                            {editingCategoryId === sub.id ? (
                              <input autoFocus value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory(sub.id); if (e.key === "Escape") setEditingCategoryId(null); }}
                                onBlur={() => handleRenameCategory(sub.id)}
                                className="flex-1 text-xs bg-white/10 border border-indigo-400/60 rounded px-2 py-0.5 outline-none min-w-0 text-white placeholder:text-white/30"
                              />
                            ) : (
                              <button
                                onClick={() => selectCategory(sub.id === selectedCategoryId ? null : sub.id)}
                                onDoubleClick={() => startRename(sub)}
                                className={`flex-1 flex items-center gap-1.5 text-left text-xs truncate min-w-0 ${selectedCategoryId === sub.id ? "text-white font-semibold" : "text-white/50"}`}
                                title="Double-click to rename"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getCatColor(sub.id, categories).dot}`} />
                                {sub.name}
                              </button>
                            )}
                            {/* Rename */}
                            <button onClick={() => startRename(sub)}
                              className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-indigo-300 transition-opacity shrink-0"
                              title="Rename">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.08a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>
                            </button>
                            {/* Delete */}
                            <button onClick={() => handleDeleteCategory(sub.id)}
                              className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-opacity shrink-0 text-base leading-none"
                              title="Delete">×</button>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 tabular-nums min-w-[1.5rem] text-center bg-white/10 text-white/50`}>{sub.songIds.length}</span>
                          </div>
                        ))}

                        {/* Add subcategory input */}
                        {showAddSubCategory === cat.id && (
                        <div className="pl-3 pr-3 py-1">
                          <input autoFocus value={newSubCategoryName}
                            onChange={(e) => setNewSubCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateSubCategory(cat.id);
                              if (e.key === "Escape") { setShowAddSubCategory(null); setNewSubCategoryName(""); }
                            }}
                            onBlur={() => { if (newSubCategoryName.trim()) handleCreateSubCategory(cat.id); else setShowAddSubCategory(null); }}
                            placeholder="Subcategory name…"
                            className="w-full text-xs bg-white/10 border border-indigo-400/60 rounded px-2 py-1 outline-none text-white placeholder:text-white/30"
                        />
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add category row */}
              {showAddCategory ? (
                <div className="pl-3 pr-4 py-1.5 mt-1">
                  <input autoFocus value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateCategory();
                      if (e.key === "Escape") { setShowAddCategory(false); setNewCategoryName(""); }
                    }}
                    onBlur={() => { if (newCategoryName.trim()) handleCreateCategory(); else setShowAddCategory(false); }}
                    placeholder="Category name…"
                    className="w-full text-sm bg-white/10 border border-indigo-400/60 rounded px-2 py-1 outline-none text-white placeholder:text-white/30"
                  />
                </div>
              ) : (
                <button onClick={() => setShowAddCategory(true)}
                  className="flex items-center gap-2 w-full pl-3 pr-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors border-l-4 border-l-transparent mt-1"
                >
                  <span className="w-4 h-4 rounded-full shrink-0 bg-white/10 flex items-center justify-center text-white/60 text-base leading-none">+</span>
                  Add category
                </button>
              )}

            </div>
          </>) : (
            /* Guest — sign-in pitch */
            <div className="flex flex-col flex-1 items-stretch justify-center px-4 py-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-5">

                {/* Heading */}
                <div className="text-center">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/25 border border-indigo-400/20 flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-300">
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-white/90 leading-snug">Save more with an account</p>
                  <p className="text-xs text-white/40 mt-1">Free · no credit card needed</p>
                </div>

                {/* Benefits */}
                <div className="space-y-2.5">
                  {([
                    { text: "Songs synced across all devices",        icon: <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96Z"/> },
                    { text: "AI backgrounds saved with your song",    icon: <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2ZM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5Z"/> },
                    { text: "Organise songs into categories",         icon: <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2Z"/> },
                    { text: "Share songs via a public link",          icon: <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92Z"/> },
                  ] as { text: string; icon: React.ReactNode }[]).map(({ text, icon }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-indigo-300">
                          {icon}
                        </svg>
                      </div>
                      <span className="text-xs text-white/60 leading-snug">{text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors shadow-lg shadow-indigo-900/40"
                >
                  Sign in or create account
                </Link>

                <p className="text-center text-[10px] text-white/25 -mt-2">
                  Already have songs? They'll be waiting.
                </p>

              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 px-6 pt-3 pb-6 min-w-0 scroll-smooth">
          <div>
            {/* Sentinel: when this leaves the viewport the search bar is "stuck" */}
            <div ref={sentinelRef} className="h-0" />
            {/* Search + sort + count — sticky so it stays visible while scrolling */}
            <div className={`sticky top-0 z-20 bg-white ${searchBarStuck ? "pt-4" : "pt-0"} pb-4 flex items-center gap-3 flex-wrap -mx-6 px-6 border-b border-zinc-100 shadow-sm transition-[padding] duration-150 ${loading ? "invisible" : ""}`}>
              <div className="relative w-full max-w-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none">
                  <path d="M10.5 2a8.5 8.5 0 1 0 5.262 15.176l3.53 3.531a1 1 0 0 0 1.415-1.414l-3.53-3.53A8.5 8.5 0 0 0 10.5 2Zm-6.5 8.5a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z"/>
                </svg>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search songs…"
                  className="w-full text-sm bg-white border border-zinc-200 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
              <div className="flex-1" />
              <Link
                href="/editor/new"
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                  <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/>
                </svg>
                New Song
              </Link>
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
            </div>

            {/* Guest song import banner — shown to logged-in users who have orphaned localStorage songs */}
            {isLoggedIn && !loading && typeof window !== "undefined" && !sessionStorage.getItem("guestImportSnoozed") && (
              <GuestImportBanner
                key={importBannerKey}
                onImported={() => {
                  setImportBannerKey((k) => k + 1);
                  // Re-fetch songs from DB so the newly imported songs appear
                  fetchSongs().then((db) =>
                    setSongs(db.map((s) => ({ ...s, categoryIds: s.categoryIds ?? [], source: "db" as const })))
                  );
                }}
              />
            )}

            {loading ? (
              <div className="flex items-center justify-center pb-40" style={{ height: "50vh" }}>
                <LoadingNotes label="Loading your songs…" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 text-zinc-400">
                {songs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-6">
                    <div className="text-6xl mb-6 select-none">𝄞</div>
                    <h2 className="text-xl font-semibold text-zinc-700 mb-2">Your library is empty</h2>
                    <p className="text-sm text-zinc-400 mb-8 max-w-xs text-center leading-relaxed">
                      Search any song by name and artist — AI will build a chord sheet in seconds.
                    </p>
                    <Link href="/editor/new"
                      className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100">
                      + Add your first song
                    </Link>
                  </div>
                ) : selectedCategoryId && !search ? (
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
                          <p className="text-xs mt-1 text-zinc-400">Go to <span className="font-medium text-zinc-500">All Songs</span>, then drag a song and drop it onto this category in the sidebar.</p>
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
              <div key={`${selectedCategoryId}-${search}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 song-list-enter">
                {filtered.map((song) => {
                  const encoded = encodeSong({ id: song.id, title: song.title, artist: song.artist, lines: song.lines, style: song.style, semitones: song.semitones || undefined });
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
                        <button onClick={() => setConfirmDelete({ id: song.id, title: song.title, source: song.source })} title="Delete permanently"
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
              <div key={`${selectedCategoryId}-${search}`} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden mt-4 song-list-enter">
                {/* Column headers */}
                <div className="sticky top-0 z-10 flex items-center gap-4 px-5 py-2 border-b border-zinc-200 bg-zinc-100">
                  {isLoggedIn && <div className="w-3 shrink-0" />}
                  {/* Invisible clef spacer so SONG label aligns with title text */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="shrink-0 text-4xl leading-none select-none invisible" aria-hidden>𝄞</span>
                    <button onClick={() => handleSortClick("title")} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-800 transition-colors">
                      Song
                      {sortBy === "title" ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-indigo-500">{sortDir === "asc" ? <path d="M12 8l-6 6h12l-6-6Z"/> : <path d="M12 16l6-6H6l6 6Z"/>}</svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 opacity-20"><path d="M12 8l-6 6h12l-6-6Z"/></svg>}
                    </button>
                  </div>
                  <button onClick={() => handleSortClick("artist")} className="hidden sm:flex w-[160px] shrink-0 items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-800 transition-colors p-0">
                    Artist
                    {sortBy === "artist" ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-indigo-500">{sortDir === "asc" ? <path d="M12 8l-6 6h12l-6-6Z"/> : <path d="M12 16l6-6H6l6 6Z"/>}</svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 opacity-20"><path d="M12 8l-6 6h12l-6-6Z"/></svg>}
                  </button>
                  {isLoggedIn && <span className="hidden lg:block text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[200px] xl:w-[280px] shrink-0">Categories</span>}
                  <div className="hidden xl:block w-[100px] shrink-0 ml-4" />
                </div>
                {filtered.map((song, idx) => {
                  const encoded = encodeSong({ id: song.id, title: song.title, artist: song.artist, lines: song.lines, style: song.style, semitones: song.semitones || undefined });
                  const editUrl = `/editor/new?song=${encoded}`;
                  const viewUrl = `/view?song=${encoded}`;
                  const isDuplicating = duplicatingId === song.id;

                  const titleColor = "#3f3f46";
                  const artistColor = "#71717a";
                  const rowBg = song.style?.background;

                  const isReorderTarget = dragOverSongId === song.id;
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
                    <React.Fragment key={song.id}>
                    <div
                      draggable={isLoggedIn}
                      onDragStart={(e) => handleDragStart(e, song.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragSongId && dragSongId !== song.id) {
                          setDragOverSongId(song.id);
                        }
                      }}
                      onDragLeave={() => setDragOverSongId(null)}
                      onDrop={(e) => handleDropOnSong(e, song.id)}
                      onClick={() => window.location.href = viewUrl}
                      className={`group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-indigo-50/60 cursor-pointer ${
                        idx !== 0 || expandedSongId !== null ? "border-t border-zinc-100" : ""
                      } ${dragSongId === song.id ? "opacity-40" : ""} ${
                        isReorderTarget ? "ring-2 ring-inset ring-indigo-400" : ""
                      }`}
                    >
                      {/* Left-edge accent bar — category colour only (song colour shown via dot instead) */}
                      {!rowBg && firstCatAccent ? (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 opacity-50 ${firstCatAccent}`} />
                      ) : null}

                      {/* Drag handle */}
                      {isLoggedIn && (
                        <div className="w-3 shrink-0 text-zinc-400 group-hover:text-zinc-600 cursor-grab active:cursor-grabbing transition-colors select-none text-sm leading-none">
                          ⠿
                        </div>
                      )}

                      {/* Title — flex-1 wrapper keeps clef + link together */}
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span
                          className="shrink-0 text-4xl leading-none select-none"
                          style={{
  color: rowBg ? (isDarkColour(rowBg) ? "#d4aa7a" : rowBg) : "#c4c4c8",
  opacity: rowBg ? 1 : 0.9,
  filter: rowBg && !isDarkColour(rowBg) ? "saturate(1.6)" : undefined,
}}
                        >
                          𝄞
                        </span>
                        <Link href={viewUrl} className="min-w-0 group/title">
                          <div className="text-sm font-medium truncate group-hover/title:text-indigo-600 transition-colors" style={{ color: titleColor }}>
                            {song.title
                              ? song.title
                              : song.artist
                              ? <span className="italic" style={{ color: "#a1a1aa" }}>{song.artist}</span>
                              : <span className="italic" style={{ color: "#d4d4d8" }}>Untitled song</span>}
                          </div>
                          {song.artist && (
                            <div className="sm:hidden text-xs truncate mt-0.5" style={{ color: artistColor }}>
                              {song.artist}
                            </div>
                          )}
                        </Link>
                      </div>

                      {/* Artist */}
                      <div className="hidden sm:block w-[160px] shrink-0 text-xs truncate text-zinc-500">
                        {song.artist || <span className="text-zinc-300">—</span>}
                      </div>

                      {/* Category chips */}
                      {isLoggedIn && (
                        <div className="hidden lg:flex flex-nowrap gap-1 w-[200px] xl:w-[280px] shrink-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          {song.categoryIds.map((catId) => {
                            const cat = categories.find((c) => c.id === catId);
                            if (!cat) return null;
                            const color = getCatColor(catId, categories);
                            return (
                              <span
                                key={catId}
                                className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${color.chip}`}
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

                      {/* ⋯ / × button — visible below xl, for all users */}
                      <button
                        className="xl:hidden shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        title={expandedSongId === song.id ? "Close" : "More options"}
                        onClick={(e) => { e.stopPropagation(); setExpandedSongId(expandedSongId === song.id ? null : song.id); setCatPickerSongId(null); }}
                      >
                        {expandedSongId === song.id ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
                          </svg>
                        )}
                      </button>

                      {/* Actions — grouped pill */}
                      <div className="hidden xl:flex shrink-0 items-center justify-end ml-4 w-[100px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0 bg-zinc-100 rounded-lg p-0.5 border border-zinc-200">
                        {/* View */}
                        <Link href={viewUrl} title="View"
                          className="p-1.5 rounded-md text-zinc-500 hover:text-indigo-600 hover:bg-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
                          </svg>
                        </Link>
                        {/* Edit */}
                        <Link href={editUrl} title="Edit"
                          className="p-1.5 rounded-md text-zinc-500 hover:text-indigo-600 hover:bg-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.08a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                          </svg>
                        </Link>
                        {/* Duplicate */}
                        {song.source === "db" && (
                          <button onClick={() => handleDuplicate(song)} disabled={isDuplicating}
                            title="Duplicate"
                            className="p-1.5 rounded-md text-zinc-500 hover:text-indigo-600 hover:bg-white transition-colors disabled:opacity-30">
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
                        {selectedCategoryId && (
                          <button onClick={() => handleRemoveFromCategory(song.id, selectedCategoryId)}
                            title="Remove from this category"
                            className="p-1.5 rounded-md text-zinc-500 hover:text-orange-500 hover:bg-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-4 8H8v-2h8v2Z"/>
                            </svg>
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => setConfirmDelete({ id: song.id, title: song.title, source: song.source })}
                          title="Delete song permanently"
                          className="p-1.5 rounded-md text-zinc-500 hover:text-red-500 hover:bg-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/>
                          </svg>
                        </button>
                        </div>
                      </div>{/* end actions */}
                    </div>

                    {/* Expanded panel — edit/duplicate/delete + categories (< xl only, all users) */}
                    {expandedSongId === song.id && (
                      <div className="xl:hidden border-t border-zinc-100 bg-zinc-50/80 px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Link href={editUrl}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
                            onClick={() => setExpandedSongId(null)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.08a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                            </svg>
                            Edit
                          </Link>
                          {song.source === "db" && (
                            <button
                              onClick={() => { handleDuplicate(song); setExpandedSongId(null); }}
                              disabled={isDuplicating}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-40">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>
                              </svg>
                              Duplicate
                            </button>
                          )}
                          <button
                            onClick={() => { setConfirmDelete({ id: song.id, title: song.title, source: song.source }); setExpandedSongId(null); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-200 text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/>
                            </svg>
                            Delete
                          </button>
                        </div>
                        {/* Categories + add picker */}
                        {isLoggedIn && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {song.categoryIds.map((catId) => {
                                const cat = categories.find((c) => c.id === catId);
                                if (!cat) return null;
                                const color = getCatColor(catId, categories);
                                return (
                                  <span key={catId} className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${color.chip}`}>
                                    {cat.name}
                                    <button onClick={() => handleRemoveFromCategory(song.id, catId)} className="opacity-60 hover:opacity-100 ml-0.5 leading-none transition-opacity">×</button>
                                  </span>
                                );
                              })}
                              <button
                                onClick={() => setCatPickerSongId(catPickerSongId === song.id ? null : song.id)}
                                className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors border border-dashed border-zinc-300 hover:border-indigo-300"
                              >
                                + Category
                              </button>
                            </div>
                            {catPickerSongId === song.id && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {categories.filter((c) => !song.categoryIds.includes(c.id)).map((cat) => {
                                  const color = getCatColor(cat.id, categories);
                                  return (
                                    <button
                                      key={cat.id}
                                      onClick={async () => {
                                        setSongs((prev) => prev.map((s) => s.id === song.id ? { ...s, categoryIds: [...s.categoryIds, cat.id] } : s));
                                        setCatPickerSongId(null);
                                        await addSongToCategory(cat.id, song.id);
                                      }}
                                      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${color.chip} opacity-70 hover:opacity-100 transition-opacity`}
                                    >
                                      {cat.name}
                                    </button>
                                  );
                                })}
                                {categories.filter((c) => !song.categoryIds.includes(c.id)).length === 0 && (
                                  <span className="text-xs text-zinc-400">All categories assigned</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Delete song?</h2>
            <p className="text-sm text-zinc-500 mb-5">
              <span className="font-medium text-zinc-700">"{confirmDelete.title}"</span> will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleDelete(confirmDelete.id, confirmDelete.source); setConfirmDelete(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />

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
