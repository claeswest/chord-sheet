import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 text-center max-w-md">
        <div className="text-2xl font-bold tracking-tight text-white mb-6">
          Chord<span className="text-indigo-400">SheetMaker</span>
        </div>

        <p className="text-7xl mb-4" aria-hidden>
          🎸
        </p>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          This page hit a wrong note
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has moved. But the
          music doesn&apos;t have to stop here.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/editor/new"
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/40"
          >
            Try the editor free →
          </Link>
          <Link
            href="/"
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-medium transition-colors border border-white/20"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
