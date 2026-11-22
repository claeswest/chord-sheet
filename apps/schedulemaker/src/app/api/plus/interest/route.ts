import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

// POST — "I want Plus."
//
// Plus cannot be bought yet. This is the question that comes before building
// a checkout: does anyone want it? One row in the activity log per account,
// tied to the account so its owner can be told when Plus exists. Pressing the
// button twice is still one person, so a second press writes nothing.
//
// Signed in only. An anonymous count could be run up by one visitor, and there
// would be nobody to tell.

export async function POST() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });

  const already = await prisma.activityLog.findFirst({
    where: { userId: account.id, type: "plus_interest" },
    select: { id: true },
  });
  if (!already) await logActivity("plus_interest", account.id);
  return NextResponse.json({ ok: true });
}
