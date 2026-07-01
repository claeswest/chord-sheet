import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PLANS, isOnTrial, planFromUser } from "@/lib/plans";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalSongs, totalCategories, recentUsers, subUsers, newSongsThisWeek, newUsersThisWeek] =
    await Promise.all([
      prisma.user.count(),
      prisma.song.count(),
      prisma.category.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          plan: true,
          stripeSubscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
          createdAt: true,
          _count: { select: { songs: true } },
        },
      }),
      // Everyone on a non-free plan — small set — to compute revenue/trials.
      prisma.user.findMany({
        where: { plan: { not: "free" } },
        select: {
          plan: true,
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
        },
      }),
      prisma.song.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

  // Revenue / subscription breakdown.
  const monthlyPrice = PLANS.monthly.price;         // $/mo
  const yearlyMonthly = PLANS.yearly.price / 12;    // annual → $/mo
  let paying = 0;
  let trialing = 0;
  let mrr = 0;
  let trialMrr = 0; // potential MRR if all current trials convert

  for (const u of subUsers) {
    if (isOnTrial(u)) {
      trialing++;
      trialMrr += u.plan === "yearly" ? yearlyMonthly : monthlyPrice;
      continue;
    }
    const eff = planFromUser(u); // resolves expired/cancelled back to "free"
    if (eff === "monthly") { paying++; mrr += monthlyPrice; }
    else if (eff === "yearly") { paying++; mrr += yearlyMonthly; }
    else if (eff === "lifetime") { paying++; } // no recurring MRR
  }

  return NextResponse.json({
    totalUsers,
    totalSongs,
    totalCategories,
    newSongsThisWeek,
    newUsersThisWeek,
    subscriptions: {
      paying,
      trialing,
      free: totalUsers - paying - trialing,
      mrr: Math.round(mrr),
      trialMrr: Math.round(trialMrr),
    },
    recentUsers,
  });
}
