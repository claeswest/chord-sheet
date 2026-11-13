import { signOut } from "@/lib/auth";
import Link from "next/link";
import AuthShell from "@/components/landing/AuthShell";

export default function SignOutPage() {
  return (
    <AuthShell>
        <h1 className="font-display font-medium text-[2rem] leading-tight tracking-[-0.02em] text-ink mb-2">
          Sign out?
        </h1>
        <p className="text-[15px] text-stone-600 mb-8">
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-paper hover:bg-stone-700 py-3 text-sm font-semibold transition-colors cursor-pointer"
          >
            Yes, sign me out
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-rule text-center">
          <Link
            href="/songs"
            className="text-sm text-stone-600 hover:text-ink underline underline-offset-4 decoration-ink/25 hover:decoration-ink transition-colors"
          >
            Cancel — take me back
          </Link>
        </div>
    </AuthShell>
  );
}
