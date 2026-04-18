"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalSongs: number;
  totalCategories: number;
  newSongsThisWeek: number;
  newUsersThisWeek: number;
  recentUsers: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    plan: string | null;
    createdAt: string;
    _count: { songs: number };
  }[];
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-5 border ${color}`}>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Overview of ChordSheet Creator</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-indigo-500 rounded-full animate-spin" />
          Loading stats…
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Total users"
              value={stats.totalUsers}
              sub={`+${stats.newUsersThisWeek} this week`}
              color="bg-zinc-900 border-zinc-800"
            />
            <StatCard
              label="Total songs"
              value={stats.totalSongs}
              sub={`+${stats.newSongsThisWeek} this week`}
              color="bg-zinc-900 border-zinc-800"
            />
            <StatCard
              label="Categories"
              value={stats.totalCategories}
              color="bg-zinc-900 border-zinc-800"
            />
            <StatCard
              label="Avg songs/user"
              value={
                stats.totalUsers > 0
                  ? (stats.totalSongs / stats.totalUsers).toFixed(1)
                  : "0"
              }
              color="bg-zinc-900 border-zinc-800"
            />
          </div>

          {/* Recent signups */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent signups</h2>
              <Link
                href="/admin/users"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all →
              </Link>
            </div>
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
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
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
                    <td className="px-5 py-3 text-zinc-400 hidden md:table-cell truncate max-w-[180px]">
                      {user.email}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
