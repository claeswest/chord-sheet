import { NextRequest, NextResponse } from "next/server";
import { currentAccount, currentUserId, withinPlan } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { PLANS } from "@/lib/plans";
import { cleanState } from "@/lib/sheetState";
import { countSchedules, createSchedule, lessonCount, listSchedules } from "@/lib/scheduleDb";
import { linkedIds } from "@/lib/linkDb";

// The signed-in person's saved schedules: list them, add one.
//
// Nothing here works without a session, and nothing here exists for a visitor
// who has not made an account — for them the schedule is still only in their
// own browser.

/** A whole upper-secondary week with its glossary is about 15 kB. */
const MAX_BODY_CHARS = 300_000;

const unauthorized = () => NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });
const unreadable = () =>
  NextResponse.json({ error: "Det där gick inte att läsa som ett schema." }, { status: 400 });

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  // Which of them have a link is asked separately and allowed to fail: the
  // list is what this page is for, and it must not go blank because the
  // links' table could not be read.
  const [schedules, linked] = await Promise.all([
    listSchedules(userId),
    linkedIds(userId).catch(() => [] as string[]),
  ]);
  return NextResponse.json(
    { schedules: schedules.map((s) => ({ ...s, linked: linked.includes(s.id) })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const userId = account.id;

  const raw = await req.text().catch(() => "");
  if (raw.length === 0 || raw.length > MAX_BODY_CHARS) return unreadable();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return unreadable();
  }
  // The same check as before printing: what is stored is what was checked,
  // not what was sent.
  const checked = cleanState(parsed);
  if (!checked) return unreadable();
  const state = withinPlan(checked, account.plan);

  const limit = PLANS[account.plan].features.scheduleLimit;
  if ((await countSchedules(userId)) >= limit) {
    return NextResponse.json(
      {
        error: `Du har ${limit} sparade scheman, och fler får inte plats. Ta bort några du inte behöver.`,
      },
      { status: 403 },
    );
  }

  const schedule = await createSchedule(userId, state);
  await logActivity("schedule_saved", userId, { lessons: lessonCount(state), new: true });
  return NextResponse.json({ schedule }, { status: 201 });
}
