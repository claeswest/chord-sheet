import { prisma } from "@/lib/prisma";
import { PLANS, isOnTrial, planFromUser } from "@/lib/plans";
import { cancellationPending } from "@clavos/core/billing";

// The head-count at the top of the admin dashboard: how many accounts and
// songs there are, and who is paying. In one place because two things read it
// (the dashboard and the MCP server), and they must not disagree about what
// "paying" means.

export interface SiteNumbers {
  totalUsers: number;
  totalSongs: number;
  totalCategories: number;
  newSongsThisWeek: number;
  newUsersThisWeek: number;
  subscriptions: {
    paying: number;
    trialing: number;
    cancelling: number;
    free: number;
    /** Monthly recurring revenue, in whole dollars. */
    mrr: number;
    /** What the current trials would add if every one converted. */
    trialMrr: number;
    /** What ends when the pending cancellations take effect. */
    cancellingMrr: number;
  };
}

export async function siteNumbers(now = Date.now()): Promise<SiteNumbers> {
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalSongs, totalCategories, subUsers, newSongsThisWeek, newUsersThisWeek] =
    await Promise.all([
      prisma.user.count(),
      prisma.song.count(),
      prisma.category.count(),
      // Everyone on a non-free plan — small set — to compute revenue/trials.
      prisma.user.findMany({
        where: { plan: { not: "free" } },
        select: {
          plan: true,
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
          stripeCancelAt: true,
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
  let cancelling = 0;
  let mrr = 0;
  let trialMrr = 0;      // potential MRR if all current trials convert
  let cancellingMrr = 0; // MRR that ends when pending cancellations take effect

  for (const u of subUsers) {
    // A pending cancellation outranks everything else. Stripe keeps the
    // status "active" (or "trialing") and the plan unchanged until the period
    // ends, so without this a subscriber who has already left counted as
    // paying — and as recurring revenue — for up to a year. Same rule as the
    // Cancelling tab on the users list, so the two agree.
    if (cancellationPending(u.stripeCancelAt) && planFromUser(u) !== "free") {
      cancelling++;
      if (!isOnTrial(u)) cancellingMrr += u.plan === "yearly" ? yearlyMonthly : u.plan === "monthly" ? monthlyPrice : 0;
      continue;
    }
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

  return {
    totalUsers,
    totalSongs,
    totalCategories,
    newSongsThisWeek,
    newUsersThisWeek,
    subscriptions: {
      paying,
      trialing,
      cancelling,
      free: totalUsers - paying - trialing - cancelling,
      mrr: Math.round(mrr),
      trialMrr: Math.round(trialMrr),
      cancellingMrr: Math.round(cancellingMrr),
    },
  };
}
