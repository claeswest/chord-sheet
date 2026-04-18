"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Song {
  id: string;
  title: string;
  artist: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  plan: string | null;
  createdAt: string;
  _count: { songs: number; categories: number };
  songs: Song[];
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AdminUsersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const currentQ = searchParams.get("q") ?? "";

  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(currentQ);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const load = useCallback(
    (page: number, q: string) => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      fetch(`/api/admin/users?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load users");
          return r.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    load(currentPage, currentQ);
  }, [currentPage, currentQ, load]);

  function navigate(page: number, q: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    router.push(`/admin/users?${params}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(1, search);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          {data && (
            <p className="text-zinc-400 text-sm mt-1">
              {data.total} user{data.total !== 1 ? "s" : ""} total
            </p>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>
          {currentQ && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                navigate(1, "");
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
            >
              ×
            </button>
          )}
        </form>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-indigo-500 rounded-full animate-spin" />
          Loading…
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Songs
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden sm:table-cell">
                    Plan
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden lg:table-cell">
                    Joined
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <>
                    <tr
                      key={user.id}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer ${
                        expandedUserId === user.id ? "bg-zinc-800/20" : ""
                      }`}
                      onClick={() =>
                        setExpandedUserId(expandedUserId === user.id ? null : user.id)
                      }
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-white truncate max-w-[120px]">
                            {user.name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-zinc-400 hidden md:table-cell">
                        <span className="truncate block max-w-[200px]">{user.email}</span>
                      </td>
                      <td className="px-5 py-3 text-zinc-300">{user._count.songs}</td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.plan === "pro"
                              ? "bg-indigo-900 text-indigo-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {user.plan ?? "free"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 text-xs hidden lg:table-cell">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 text-right">
                        <span className="text-xs">
                          {expandedUserId === user.id ? "▲" : "▼"}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded: recent songs */}
                    {expandedUserId === user.id && (
                      <tr key={`${user.id}-expanded`} className="border-b border-zinc-800/50">
                        <td colSpan={6} className="px-5 py-4 bg-zinc-950">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                            Recent songs ({user._count.songs} total)
                          </p>
                          {user.songs.length === 0 ? (
                            <p className="text-sm text-zinc-600 italic">No songs yet</p>
                          ) : (
                            <div className="space-y-2">
                              {user.songs.map((song) => (
                                <div
                                  key={song.id}
                                  className="flex items-center justify-between gap-4 bg-zinc-900 rounded-lg px-4 py-2.5"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-white">{song.title}</p>
                                    {song.artist && (
                                      <p className="text-xs text-zinc-500">{song.artist}</p>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-600 shrink-0">
                                    {formatDate(song.createdAt)}
                                  </p>
                                </div>
                              ))}
                              {user._count.songs > user.songs.length && (
                                <p className="text-xs text-zinc-600 pl-1">
                                  + {user._count.songs - user.songs.length} more
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {data.users.length === 0 && (
              <div className="px-5 py-12 text-center text-zinc-500">No users found</div>
            )}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-zinc-500">
                Page {data.page} of {data.pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={data.page <= 1}
                  onClick={() => navigate(data.page - 1, currentQ)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                >
                  ← Prev
                </button>
                <button
                  disabled={data.page >= data.pages}
                  onClick={() => navigate(data.page + 1, currentQ)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-400">Loading…</div>}>
      <AdminUsersInner />
    </Suspense>
  );
}
