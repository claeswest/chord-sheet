import { NextResponse } from "next/server";
import { accountsEnabled, currentAccount, currentUserId, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET    — is anyone signed in, and does this site have accounts at all?
// DELETE — remove the signed-in person's account and everything in it.
//
// The page asks GET once when it loads. `enabled: false` is how a deployment
// with no database says "behave as before": no sign-in, no save, no list.

const fresh = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  if (!accountsEnabled) return NextResponse.json({ enabled: false, user: null }, fresh);
  const account = await currentAccount();
  if (!account) return NextResponse.json({ enabled: true, user: null }, fresh);
  // The plan is sent so the page can draw the right doors open. It is not
  // what opens them: every route that depends on a plan asks again itself.
  return NextResponse.json({ enabled: true, user: { email: account.email, plan: account.plan } }, fresh);
}

/**
 * Delete the account.
 *
 * One row. The schedules, the sign-in records and the sessions all hang off
 * the user with onDelete: Cascade, so the database removes them — there is no
 * list of tables here to forget one from. The activity log keeps its rows with
 * the user blanked: counts of what happened, attached to nobody.
 */
export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });
  await prisma.user.delete({ where: { id: userId } });
  // The session row went with the user; this clears the cookie that pointed at it.
  await signOut({ redirect: false }).catch(() => {});
  return NextResponse.json({ ok: true });
}
