import { NextRequest, NextResponse } from "next/server";
import { currentAccount, currentUserId, withinPlan } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { cleanState } from "@/lib/sheetState";
import { deleteSchedule, getSchedule, lessonCount, updateSchedule } from "@/lib/scheduleDb";

// One saved schedule: read it, save over it, delete it.

type Ctx = { params: Promise<{ id: string }> };

const MAX_BODY_CHARS = 300_000;

const unauthorized = () => NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });
// 404 for another person's schedule as for one that does not exist: whether
// an id is real is not something to tell a person it does not belong to.
const notFound = () => NextResponse.json({ error: "Det schemat finns inte." }, { status: 404 });

export async function GET(_req: NextRequest, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  const schedule = await getSchedule(userId, id);
  if (!schedule) return notFound();
  // Checked on the way out as well as on the way in. What was stored was
  // clean when it was stored; the shape of a sheet may have grown since.
  const state = cleanState(schedule.state);
  if (!state) return notFound();
  return NextResponse.json(
    { schedule: { id: schedule.id, title: schedule.title, updatedAt: schedule.updatedAt, state } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const userId = account.id;
  const { id } = await params;

  const raw = await req.text().catch(() => "");
  let parsed: unknown = null;
  if (raw.length > 0 && raw.length <= MAX_BODY_CHARS) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const checked = cleanState(parsed);
  if (!checked) {
    return NextResponse.json({ error: "Det där gick inte att läsa som ett schema." }, { status: 400 });
  }
  const state = withinPlan(checked, account.plan);

  if (!(await updateSchedule(userId, id, state))) return notFound();
  await logActivity("schedule_saved", userId, { lessons: lessonCount(state), new: false });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!(await deleteSchedule(userId, id))) return notFound();
  await logActivity("schedule_deleted", userId);
  return NextResponse.json({ ok: true });
}
