// What a free account has left of the features it gets a taste of.
//
// The free plan includes PDF export and share links for a few songs (the
// numbers are in plans.ts). "For a song" rather than "a number of times" on
// purpose: fixing a typo and exporting again, or sending a fresh link after an
// edit, should not use up the allowance.
//
// Nothing is stored for this. A share link and a PDF export each already leave
// a row in the activity log with the song's id, and the allowance is counted
// from those.

import { prisma } from "./prisma";
import { featureLimit, type Plan } from "./plans";

export type CountedFeature = "pdfExport" | "sharing";

/**
 * The day the allowance began. Exports and links from before it are not
 * counted: they were made on a paid plan, by people who may since have left
 * it, and would have used up an allowance that did not exist yet.
 */
const ALLOWANCE_SINCE = new Date("2026-11-15T00:00:00Z");

const EVENT: Record<CountedFeature, string> = {
  pdfExport: "pdf_exported",
  sharing: "share_created",
};

/** The songs an account has already used a feature on. A song with no id yet counts by its title. */
export async function songsUsed(userId: string, feature: CountedFeature): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ k: string }[]>`
    select distinct coalesce(meta->>'songId', meta->>'title', id) as k
    from "ActivityLog"
    where "userId" = ${userId} and type = ${EVENT[feature]} and "createdAt" >= ${ALLOWANCE_SINCE}`;
  return rows.map((r) => r.k);
}

export interface Allowance {
  /** May this song use the feature now? */
  allowed: boolean;
  /** Songs still unused. null = no limit. */
  left: number | null;
  /** The plan's limit. null = no limit, 0 = not in the plan. */
  limit: number | null;
}

export async function allowanceFor(
  userId: string,
  plan: Plan,
  feature: CountedFeature,
  songKey?: string | null,
): Promise<Allowance> {
  const limit = featureLimit(plan, feature);
  if (limit === null) return { allowed: true, left: null, limit: null };
  if (limit === 0) return { allowed: false, left: 0, limit: 0 };
  const used = await songsUsed(userId, feature);
  const left = Math.max(0, limit - used.length);
  // A song already counted can go on being exported or shared.
  const already = !!songKey && used.includes(songKey);
  return { allowed: already || left > 0, left, limit };
}
