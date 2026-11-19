import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { adminInsights, type AdminInsights } from "@/lib/adminInsights";
import { siteNumbers } from "@/lib/siteNumbers";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [numbers, recentUsers] = await Promise.all([
    // The head-count and who is paying. Shared with the MCP server.
    siteNumbers(),
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
        stripeCancelAt: true,
        createdAt: true,
        _count: { select: { songs: true } },
      },
    }),
  ]);

  // The newer half of the dashboard. On its own try, so a fault in it leaves
  // the head-count above standing and says what went wrong.
  let insights: AdminInsights | null = null;
  let insightsError: string | null = null;
  try {
    insights = await adminInsights();
  } catch (e) {
    insightsError = (e as Error)?.message ?? "unknown error";
    console.error("[admin/stats] insights failed", e);
  }

  return NextResponse.json({
    insights,
    insightsError,
    ...numbers,
    recentUsers,
  });
}
