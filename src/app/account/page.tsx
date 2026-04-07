import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { planFromUser, PLANS, Plan } from "@/lib/plans";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      plan: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const plan = planFromUser(user) as Plan;
  const planConfig = PLANS[plan];
  const isPaid = plan !== "free";

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">
          Chord<span className="text-indigo-600">SheetCreator</span>
        </Link>
        <div className="w-px h-5 bg-zinc-200" />
        <Link href="/songs" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          ← Songs
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-6 py-12 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex items-center gap-5">
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold text-zinc-900">{user.name ?? "—"}</div>
            <div className="text-sm text-zinc-500">{user.email}</div>
            <div className="text-xs text-zinc-300 mt-1">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Plan card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Current plan</h2>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isPaid ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-500"
            }`}>
              {planConfig.name}
            </span>
          </div>

          {isPaid ? (
            <div className="space-y-2 text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>Price</span>
                <span className="font-medium text-zinc-900">
                  ${planConfig.price}{plan === "monthly" ? "/mo" : plan === "yearly" ? "/yr" : " once"}
                </span>
              </div>
              {user.stripeCurrentPeriodEnd && plan !== "lifetime" && (
                <div className="flex justify-between">
                  <span>Renews</span>
                  <span className="font-medium text-zinc-900">
                    {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">
                You&apos;re on the free plan — limited to 20 songs.
              </p>
              <Link
                href="/pricing"
                className="inline-block text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Upgrade plan
              </Link>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Account</h2>
          <a
            href="/api/auth/signout"
            className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}
