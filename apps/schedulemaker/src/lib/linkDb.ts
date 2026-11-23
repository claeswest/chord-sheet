// A link that always shows the latest saved version of a schedule.
//
// The other way to share (lib/share.ts) puts a copy of the schedule in the
// link itself. That copy is frozen: move a lesson to another room and every
// family holding the link has the old room. For one parent passing a sheet to
// the class that is fine. For the person the class gets its schedule *from* —
// a teacher, a coach — it is the whole problem, and this is the answer: the
// link holds a token, the token points at the saved schedule, and whoever
// opens it sees what was saved last.
//
// It is a Plus feature to turn on (lib/plans.ts). It is also the first thing
// in this app that shows a stored schedule to someone who is not signed in,
// so the rules are few and strict:
//
// - The token is 128 random bits. Nobody guesses one; having the link is the
//   only way in.
// - A link exists only because its owner made it, and stops the moment they
//   remove it, delete the schedule or delete the account (onDelete: Cascade).
// - Everything here that changes a link takes the owner's id and checks it,
//   the same as lib/scheduleDb.ts.
// - Looking one up by token returns the sheet and nothing about whose it is.

import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

/** A fresh token: 22 characters, safe in an address. */
function newToken(): string {
  return randomBytes(16).toString("base64url");
}

/** The link for one of this person's schedules, or null: no link, or not theirs. */
export async function linkFor(userId: string, scheduleId: string): Promise<string | null> {
  const link = await prisma.sharedLink.findFirst({
    where: { scheduleId, schedule: { userId } },
    select: { token: true },
  });
  return link?.token ?? null;
}

/**
 * Turn the link on. Returns its token — the existing one if it was already
 * on, so pressing twice does not strand everyone holding the first link — or
 * null when the schedule is not theirs.
 */
export async function createLink(userId: string, scheduleId: string): Promise<string | null> {
  const owned = await prisma.schedule.findFirst({ where: { id: scheduleId, userId }, select: { id: true } });
  if (!owned) return null;
  const existing = await prisma.sharedLink.findUnique({ where: { scheduleId }, select: { token: true } });
  if (existing) return existing.token;
  const made = await prisma.sharedLink.create({
    data: { token: newToken(), scheduleId },
    select: { token: true },
  });
  return made.token;
}

/** Turn the link off. False when there was none of theirs to remove. */
export async function removeLink(userId: string, scheduleId: string): Promise<boolean> {
  const done = await prisma.sharedLink.deleteMany({ where: { scheduleId, schedule: { userId } } });
  return done.count > 0;
}

/** Which of this person's schedules have a link, for marking them in the list. */
export async function linkedIds(userId: string): Promise<string[]> {
  const links = await prisma.sharedLink.findMany({
    where: { schedule: { userId } },
    select: { scheduleId: true },
  });
  return links.map((l) => l.scheduleId);
}

/**
 * What a link shows: the sheet as last saved, and when that was.
 *
 * Nothing else. Not the owner, not their address, not the schedule's id — the
 * person opening a link is a stranger to this database and gets what the
 * owner chose to show them.
 */
export async function sheetBehind(token: string): Promise<{ state: unknown; updatedAt: Date } | null> {
  // The shape a token can have, checked before asking the database about it.
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return null;
  const link = await prisma.sharedLink.findUnique({
    where: { token },
    select: { schedule: { select: { state: true, updatedAt: true } } },
  });
  return link ? { state: link.schedule.state, updatedAt: link.schedule.updatedAt } : null;
}
