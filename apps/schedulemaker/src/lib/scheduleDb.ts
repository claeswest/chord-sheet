// Saved schedules, on the server.
//
// Every function takes the signed-in person's id and looks only at rows that
// are theirs. There is no way through this file to a schedule without its
// owner — which is the property to keep as it grows, because a schedule is a
// child's name, class and whereabouts, and the one failure this feature must
// not have is showing one family another's.

import { prisma } from "./prisma";
import type { SheetState } from "./sheetState";

export type SavedItem = {
  id: string;
  title: string;
  detail: string | null;
  updatedAt: Date;
};

const LISTED = { id: true, title: true, detail: true, updatedAt: true } as const;

/** What the list calls a schedule, taken from the sheet itself. */
function labels(state: SheetState): { title: string; detail: string | null } {
  const s = state.schedule;
  const subtitle = (s.subtitle ?? "").trim();
  const where = [s.title.trim(), subtitle].filter(Boolean).join(" · ");
  const heading = s.heading?.trim();
  // The banner is the name on the fridge ("Annas schema"). Without one, the
  // class is the best name there is, and then it should not be said twice.
  if (heading) return { title: heading.slice(0, 200), detail: where.slice(0, 300) || null };
  return { title: (s.title.trim() || "Schema").slice(0, 200), detail: subtitle.slice(0, 300) || null };
}

export function listSchedules(userId: string): Promise<SavedItem[]> {
  return prisma.schedule.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: LISTED,
  });
}

export function countSchedules(userId: string): Promise<number> {
  return prisma.schedule.count({ where: { userId } });
}

export function getSchedule(userId: string, id: string) {
  // findFirst with both, not findUnique by id: the owner is part of the
  // question, so somebody else's id simply finds nothing.
  return prisma.schedule.findFirst({
    where: { id, userId },
    select: { ...LISTED, state: true },
  });
}

export function createSchedule(userId: string, state: SheetState): Promise<SavedItem> {
  return prisma.schedule.create({
    data: { userId, ...labels(state), state: state as object },
    select: LISTED,
  });
}

/** Prisma's "nothing matched": no such row, or not theirs. */
function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2025";
}

/**
 * False when there is no such schedule of theirs.
 *
 * update(), not updateMany(), and this is not a matter of taste. The Neon HTTP
 * driver cannot run transactions, and Prisma turns updateMany into one — so it
 * throws "Transactions are not supported in HTTP mode" the first time anyone
 * saves a schedule twice. It typechecks and it builds; it only fails when run.
 * update() with the owner in `where` is one statement, and finding nothing is
 * an error to catch rather than a count of zero. (RecipeBookMaker's recipeDb
 * carries the same note. deleteMany, below, is one statement and is fine.)
 */
export async function updateSchedule(userId: string, id: string, state: SheetState): Promise<boolean> {
  try {
    await prisma.schedule.update({
      where: { id, userId },
      data: { ...labels(state), state: state as object },
    });
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

export async function deleteSchedule(userId: string, id: string): Promise<boolean> {
  const done = await prisma.schedule.deleteMany({ where: { id, userId } });
  return done.count > 0;
}

/** A second schedule with the same content, named as a copy. Null when the original is not theirs. */
export async function copySchedule(userId: string, id: string): Promise<SavedItem | null> {
  const original = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!original) return null;
  return prisma.schedule.create({
    data: {
      userId,
      title: (original.title + " (kopia)").slice(0, 200),
      detail: original.detail,
      state: original.state as object,
    },
    select: LISTED,
  });
}

/** How many lessons a sheet has — the one thing the activity log says about it. */
export function lessonCount(state: SheetState): number {
  return state.schedule.weeks.reduce(
    (n, w) => n + w.days.reduce((m, d) => m + d.lessons.length, 0),
    0,
  );
}
