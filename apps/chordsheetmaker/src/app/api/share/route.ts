import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { planFromUser } from "@/lib/plans";
import { allowanceFor } from "@/lib/allowance";
import { logActivity } from "@/lib/activity";

// POST /api/share — save a full song snapshot. Returns { token }, which maps
// to /share/[token].
//
// Needs an account, and is checked against the plan here. It used to need
// neither: the lock was only in the page, so anybody could post to this
// address and get a link. Free accounts may share a few songs (plans.ts);
// which ones they have used is read from the activity log, where each new
// link leaves a row.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "signin" }, { status: 401 });
  }

  const { title, artist, lines, style, songId } = await req.json();

  if (!lines) {
    return NextResponse.json({ error: "Missing song content" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, stripeSubscriptionId: true, stripeCurrentPeriodEnd: true, stripeSubscriptionStatus: true },
  });
  const plan = user ? planFromUser(user) : "free";
  const songKey = (typeof songId === "string" && songId) || (typeof title === "string" && title) || null;
  const allowance = await allowanceFor(session.user.id, plan, "sharing", songKey);
  if (!allowance.allowed) {
    return NextResponse.json({ error: "limit", limit: allowance.limit }, { status: 403 });
  }

  const share = await prisma.share.create({
    data: {
      title: title ?? "Untitled Song",
      artist: artist ?? "",
      content: { lines, style: style ?? null },
    },
  });

  await logActivity("share_created", session.user.id, {
    ...(songKey ? { songId: songKey } : {}),
    title: typeof title === "string" ? title.slice(0, 200) : undefined,
    token: share.id,
  });

  return NextResponse.json({ token: share.id });
}
