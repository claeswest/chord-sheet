import { signIn, googleEnabled, emailEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  const nothingConfigured = !googleEnabled && !emailEnabled;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-nunito)" }}>
        Sign in to RecipeBookMaker
      </h1>
      <p className="mt-2 text-sm text-stone-600">Your recipes, kept in one place.</p>

      {nothingConfigured && (
        // Visible only in local development before OAuth is set up — better than
        // a login page with no buttons and no explanation.
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          No sign-in method is configured. Set <code>GOOGLE_CLIENT_ID</code> and{" "}
          <code>GOOGLE_CLIENT_SECRET</code>, or <code>RESEND_API_KEY</code>, in{" "}
          <code>apps/recipemaker/.env</code>.
        </p>
      )}

      {googleEnabled && (
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/recipes" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white"
          >
            Continue with Google
          </button>
        </form>
      )}

      {emailEnabled && (
        <form
          className="mt-3 space-y-3"
          action={async (formData: FormData) => {
            "use server";
            await signIn("resend", {
              email: String(formData.get("email") ?? ""),
              redirectTo: "/recipes",
            });
          }}
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-full border border-stone-300 px-5 py-3 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold"
          >
            Email me a sign-in link
          </button>
        </form>
      )}
    </main>
  );
}
