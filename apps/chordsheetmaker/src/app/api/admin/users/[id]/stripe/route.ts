import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Admin-only: "Open in Stripe" for one user. A redirect on the server rather
// than a link in the page, so the Stripe customer id is not sent to the
// browser with every user list — it appears only in the address you land on.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { stripeCustomerId: true } });
  if (!user?.stripeCustomerId) {
    // Never been through checkout: back to their page, which says so.
    return NextResponse.redirect(new URL(`/admin/users/${encodeURIComponent(id)}`, req.url));
  }

  // Test-mode customers live under /test in the dashboard.
  const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "test/" : "";
  return NextResponse.redirect(
    `https://dashboard.stripe.com/${mode}customers/${encodeURIComponent(user.stripeCustomerId)}`,
  );
}
