import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { songFacts } from "@/lib/adminSongsQuery";
import { BG_FILTERS, SONG_ORIGINS, SONG_SORTS, pick, type AdminSongRow } from "@/lib/adminSongs";

// Admin-only: the songs list — search, filters, sort, paging.
// Filters and counts run over the whole filtered set, in the database.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = 25;
  const q = sp.get("q")?.trim() ?? "";
  const origin = pick(SONG_ORIGINS, sp.get("origin"));
  const bg = pick(BG_FILTERS, sp.get("bg"));
  const ai = sp.get("ai") === "1";
  const empty = sp.get("empty") === "1";
  const sort = pick(SONG_SORTS, sp.get("sort")) ?? "newest";
  const includeAdmins = sp.get("admins") === "1";

  const conds: Prisma.Sql[] = [];
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(Prisma.sql`(f.title ilike ${like} or f.artist ilike ${like} or f."userName" ilike ${like} or f."userEmail" ilike ${like})`);
  }
  if (origin) conds.push(Prisma.sql`f.origin = ${origin}`);
  if (bg === "any") conds.push(Prisma.sql`f."hasBg"`);
  if (bg === "none") conds.push(Prisma.sql`not f."hasBg"`);
  if (bg === "ai") conds.push(Prisma.sql`f."hasBg" and f."bgSource" = 'ai'`);
  if (bg === "upload") conds.push(Prisma.sql`f."hasBg" and f."bgSource" = 'upload'`);
  if (bg === "untracked") conds.push(Prisma.sql`f."hasBg" and f."bgSource" is null`);
  if (ai) conds.push(Prisma.sql`f."aiStyled"`);
  if (empty) conds.push(Prisma.sql`f.lines = 0`);
  const where = conds.length ? Prisma.sql`where ${Prisma.join(conds, " and ")}` : Prisma.empty;

  const order = {
    newest: Prisma.sql`f."createdAt" desc`,
    oldest: Prisma.sql`f."createdAt" asc`,
    updated: Prisma.sql`f."updatedAt" desc`,
    longest: Prisma.sql`f.chars desc`,
  }[sort];

  // Built with Prisma.sql and passed in, not written as $queryRaw`…`: used as
  // a tag, $queryRaw sent the nested fragments as parameters, and Postgres
  // answered "syntax error at or near $1".
  const rows = await prisma.$queryRaw<(AdminSongRow & { total: number })[]>(Prisma.sql`
    select f.*, count(*) over ()::int as total
    from (${songFacts(includeAdmins)}) f
    ${where}
    order by ${order}, f.id
    limit ${limit} offset ${(page - 1) * limit}
  `);

  const total = rows[0]?.total ?? 0;
  const songs = rows.map(({ total: _t, ...r }) => r);
  return NextResponse.json({ songs, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}
