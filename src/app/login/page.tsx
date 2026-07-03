import type { Metadata } from "next";
import { signIn, appleEnabled, emailEnabled } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to ChordSheetMaker to access your chord sheets from any device. Continue with Apple, Google or GitHub.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; from?: string }>;
}) {
  const { from } = await searchParams;
  const fromSave = from === "save";
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

        {/* Contextual reassurance when arriving from the "Keep my song" nudge */}
        {fromSave && (
          <div className="flex items-start gap-2.5 text-left bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-6">
            <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <p className="text-sm text-emerald-800 leading-snug">
              <strong className="font-semibold">Your song is saved on this device.</strong>{" "}
              Create a free account to keep it everywhere — it&apos;s waiting for you.
            </p>
          </div>
        )}

        {/* Logo */}
        <div className="text-2xl font-bold tracking-tight mb-1">
          Chord<span className="text-indigo-600">SheetMaker</span>
        </div>
        <p className="text-sm text-zinc-500 mb-5">
          Sign in or create your <strong className="text-zinc-700">free account</strong> — one click, no forms
        </p>

        {/* What you get */}
        <ul className="text-left text-sm text-zinc-600 space-y-2 mb-7">
          {[
            "Keep your chord charts safe on every device",
            "Organize songs into setlists for each gig",
            "Pick up on your phone what you built on your laptop",
          ].map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          {appleEnabled && (
            <form
              action={async () => {
                "use server";
                const { next } = await searchParams;
                await signIn("apple", { redirectTo: next ?? "/songs" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <svg width="16" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"/>
                </svg>
                Continue with Apple
              </button>
            </form>
          )}
          <form
            action={async () => {
              "use server";
              const { next } = await searchParams;
              await signIn("google", { redirectTo: next ?? "/songs" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 border border-zinc-300 shadow-sm text-zinc-800 text-sm font-semibold py-3 rounded-lg hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        {/* Passwordless email — no third-party account needed */}
        {emailEnabled && (
          <>
            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs text-zinc-400">or</span>
              <span className="h-px flex-1 bg-zinc-200" />
            </div>
            <form
              action={async (formData: FormData) => {
                "use server";
                const { next } = await searchParams;
                await signIn("resend", {
                  email: String(formData.get("email") ?? "").trim(),
                  redirectTo: next ?? "/songs",
                });
              }}
              className="flex flex-col gap-2"
            >
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                className="w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Email me a sign-in link
              </button>
            </form>
          </>
        )}

        {/* GitHub — kept, but demoted: musicians rarely have one */}
        <form
          action={async () => {
            "use server";
            const { next } = await searchParams;
            await signIn("github", { redirectTo: next ?? "/songs" });
          }}
          className="mt-4"
        >
          <button
            type="submit"
            className="mx-auto flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors py-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
        </form>

        <p className="text-xs text-zinc-400 mt-6">
          Free forever plan · No credit card required
        </p>
        <p className="text-xs text-zinc-300 mt-2">
          By signing in you agree to our terms of service
        </p>

        <div className="mt-6 pt-6 border-t border-zinc-100">
          <Link href="/songs" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
            Continue without an account
          </Link>
        </div>
      </div>
    </div>
  );
}
