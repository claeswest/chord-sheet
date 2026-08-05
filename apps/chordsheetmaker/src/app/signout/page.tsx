import { signOut } from "@/lib/auth";
import Link from "next/link";

export default function SignOutPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" }}
    >
      {/* Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)",
        }}
      />

      {/* White card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl shadow-black/40 p-10 w-full max-w-sm text-center">

        {/* Logo */}
        <div className="text-2xl font-bold tracking-tight mb-1">
          Chord<span className="text-indigo-600">SheetMaker</span>
        </div>
        <p className="text-sm text-zinc-400 mb-8">
          Your songs are saved and ready when you come back
        </p>

        {/* Sign out action */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Yes, sign me out
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-100">
          <Link
            href="/songs"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Cancel — take me back
          </Link>
        </div>
      </div>
    </div>
  );
}
