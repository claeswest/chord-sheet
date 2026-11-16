// Which country each user is in, for the admin.
//
// There is no country column. The activity log records, on each thing a
// person does, the country their request came from (lib/activity.ts), and a
// user's country is the one on their most recent such row. That keeps it
// current if someone moves, and needed no change to the database.

import { prisma } from "./prisma";

/** userId → two-letter country code, for the users who have one on record. */
export async function countriesOf(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ userId: string; country: string }[]>`
    select distinct on ("userId") "userId", meta->>'country' as country
    from "ActivityLog"
    where "userId" = any(${userIds}::text[]) and meta->>'country' is not null
    order by "userId", "createdAt" desc`;
  return new Map(rows.map((r) => [r.userId, r.country]));
}
