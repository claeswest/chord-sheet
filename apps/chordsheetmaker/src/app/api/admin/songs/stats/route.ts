import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { songFacts } from "@/lib/adminSongsQuery";
import { PROVENANCE_SINCE, type AdminSongStats } from "@/lib/adminSongs";

// Admin-only: the numbers at the top of the Songs page. Averages of length are
// over songs with at least one lyric line — an empty song isn't a short one,
// and it is counted on its own.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const includeAdmins = new URL(req.url).searchParams.get("admins") === "1";
  const facts = songFacts(includeAdmins);
  const since = new Date(PROVENANCE_SINCE);

  // Each query is built with Prisma.sql and passed in: as a template tag,
  // $queryRaw sends nested fragments (the shared song facts) as parameters.
  const [[totals], origins, fonts, weeks] = await Promise.all([
    prisma.$queryRaw<Omit<AdminSongStats, "origins" | "fonts" | "weeks">[]>(Prisma.sql`
      select
        count(*)::int as total,
        count(*) filter (where "createdAt" > now() - interval '7 days')::int as new7,
        count(*) filter (where "createdAt" > now() - interval '30 days')::int as new30,
        count(distinct "userId")::int as authors,
        count(*) filter (where lines = 0)::int as empty,
        count(*) filter (where "hasBg")::int as "withBg",
        count(*) filter (where "hasBg" and "bgSource" = 'ai')::int as "bgAi",
        count(*) filter (where "hasBg" and "bgSource" = 'upload')::int as "bgUpload",
        count(*) filter (where "aiStyled")::int as "aiStyled",
        count(*) filter (where "updatedAt" >= ${since})::int as "trackedSince",
        coalesce(round(avg(lines) filter (where lines > 0), 1), 0)::float8 as "avgLines",
        coalesce(round(avg(chars) filter (where lines > 0)), 0)::float8 as "avgChars",
        coalesce(percentile_cont(0.5) within group (order by chars) filter (where lines > 0), 0)::float8 as "medianChars",
        coalesce(round(avg(chords) filter (where lines > 0)), 0)::float8 as "avgChords",
        coalesce(round(avg(sections) filter (where lines > 0), 1), 0)::float8 as "avgSections",
        coalesce(round(avg(bytes)), 0)::float8 as "avgBytes",
        coalesce(max(bytes), 0)::int as "maxBytes"
      from (${facts}) f
    `),
    prisma.$queryRaw<{ origin: string; n: number }[]>(Prisma.sql`
      select origin, count(*)::int as n from (${facts}) f group by origin order by n desc
    `),
    prisma.$queryRaw<{ font: string | null; n: number }[]>(Prisma.sql`
      select font, count(*)::int as n from (${facts}) f group by font order by n desc limit 6
    `),
    // Twelve weeks, oldest first, empty weeks included — a gap is information.
    prisma.$queryRaw<{ week: Date; n: number }[]>(Prisma.sql`
      select w.week, count(f.id)::int as n
      from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as w(week)
      left join (${facts}) f on date_trunc('week', f."createdAt") = w.week
      group by w.week order by w.week
    `),
  ]);

  const stats: AdminSongStats = {
    ...totals,
    origins: origins as AdminSongStats["origins"],
    fonts,
    weeks: weeks.map((w) => ({ week: new Date(w.week).toISOString().slice(0, 10), n: w.n })),
  };
  return NextResponse.json(stats);
}
