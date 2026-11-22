import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { PLANS } from "@/lib/plans";
import { copySchedule, countSchedules } from "@/lib/scheduleDb";

// POST — a second schedule with the same content. Last term's sheet is most
// of this term's, and a sibling's is often most of the next one's.

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });
  const userId = account.id;
  const { id } = await params;

  const limit = PLANS[account.plan].features.scheduleLimit;
  if ((await countSchedules(userId)) >= limit) {
    return NextResponse.json(
      {
        error: `Du har ${limit} sparade scheman, och fler får inte plats. Ta bort några du inte behöver.`,
      },
      { status: 403 },
    );
  }

  const schedule = await copySchedule(userId, id);
  if (!schedule) return NextResponse.json({ error: "Det schemat finns inte." }, { status: 404 });
  await logActivity("schedule_copied", userId);
  return NextResponse.json({ schedule }, { status: 201 });
}
