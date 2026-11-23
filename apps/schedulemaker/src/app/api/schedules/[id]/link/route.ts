import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createLink, linkFor, removeLink } from "@/lib/linkDb";
import { PLANS } from "@/lib/plans";

// The link that always shows the latest saved version of one schedule.
//
// GET    — is there one, and may this account make one?
// POST   — turn it on (Plus)
// DELETE — turn it off (anyone who has one, Plus or not)
//
// See lib/linkDb.ts for what the link is and the rules it keeps.

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });
const fresh = { headers: { "Cache-Control": "no-store" } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const { id } = await params;
  return NextResponse.json(
    { token: await linkFor(account.id, id), allowed: PLANS[account.plan].features.liveLink },
    fresh,
  );
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  if (!PLANS[account.plan].features.liveLink) {
    return NextResponse.json({ error: "Länken som alltid visar senaste versionen ingår i Plus." }, { status: 403 });
  }
  const { id } = await params;
  const token = await createLink(account.id, id);
  if (!token) return NextResponse.json({ error: "Det schemat finns inte." }, { status: 404 });
  await logActivity("link_created", account.id);
  return NextResponse.json({ token }, fresh);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  // No plan check: turning a link off must always be possible. Someone who had
  // Plus and no longer does should not be left with a link they cannot close.
  const account = await currentAccount();
  if (!account) return unauthorized();
  const { id } = await params;
  if (await removeLink(account.id, id)) await logActivity("link_removed", account.id);
  return NextResponse.json({ ok: true });
}
