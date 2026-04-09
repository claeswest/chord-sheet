import { signOut } from "@/lib/auth";
import Link from "next/link";

export default function SignOutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-10 w-full max-w-sm text-center">

        {/* Logo */}
        <div className="text-2xl font-bold tracking-tight mb-1">
          Chord<span className="text-indigo-600">SheetCreator</span>
        </div>
        <p className="text-sm text-zinc-400 mb-8">Your songs are saved and ready when you come back</p>

        {/* Sign out action */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Yes, sign me out
          </button>
        </form>

        <Link
          href="/songs"
          className="block mt-3 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Cancel — take me back
        </Link>
      </div>
    </div>
  );
}
