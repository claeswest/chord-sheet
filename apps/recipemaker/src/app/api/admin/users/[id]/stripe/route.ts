import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Admin-only: "Open in Stripe" for one person. A redirect on the server rather
// than a link in the page, so the Stripe customer id is never sent to the
// browser with the page — it appears only in the address you land on.
//
// Same as ChordSheetMaker's route of the same name, with one difference: a
// stranger gets a 404 here, not a 403, like everywhere else in this app's
// admin. A 403 confirms there is something to be forbidden from.
//
// A route handler has no layout above it, so this check is the only one.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return new NextResponse(null, { status: 404 });
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
