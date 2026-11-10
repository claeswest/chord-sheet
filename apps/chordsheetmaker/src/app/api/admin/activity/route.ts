import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { adminRecipients } from "@/lib/notify";
import type { Prisma } from "@/generated/prisma";

// Admin-only: paginated activity feed with type/user/date/text filters.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  // "|| 1": Math.max(1, NaN) is NaN, and "?page=abc" then reached Prisma as
  // `skip` and answered with a 500.
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = 50;
  const type = sp.get("type")?.trim();
  const userId = sp.get("userId")?.trim();
  const q = sp.get("q")?.trim();
  // A date that doesn't parse is dropped rather than passed on as Invalid Date.
  const validDay = (v: string | undefined) => (v && !Number.isNaN(new Date(v).getTime()) ? v : undefined);
  const from = validDay(sp.get("from")?.trim());
  const to = validDay(sp.get("to")?.trim());

  const where: Prisma.ActivityLogWhereInput = {};
  // The admin's own test activity is noise — excluded unless ?admins=1.
  // (Events with a deleted/null user still show.)
  if (sp.get("admins") !== "1") {
    const admins = adminRecipients();
    if (admins.length) where.NOT = { user: { email: { in: admins } } };
  }
  if (type) where.type = type;
  if (userId) where.userId = userId;
  // Anonymous visitors try the editor without an account and can fill most of
  // a page. ?guests=0 leaves only events that belong to an account.
  else if (sp.get("guests") === "0") where.userId = { not: null };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    // include the whole "to" day
    if (to) where.createdAt.lte = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  if (q) {
    // Prisma JSON filters have no case-insensitive mode, so match the song
    // title against common capitalisations of the query ("boat" must find
    // "Out of the Boat").
    const titleCase = q.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    const variants = Array.from(new Set([
      q,
      q.toLowerCase(),
      q.toUpperCase(),
      q[0].toUpperCase() + q.slice(1).toLowerCase(),
      titleCase,
    ]));
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      ...variants.map((v) => ({ meta: { path: ["title"], string_contains: v } })),
    ];
  }

  const [total, items, filterUser] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    // Who the feed is filtered to, so a link that carries only the id (from
    // the users list) can still say whose activity this is — also when that
    // person has no events at all.
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } })
      : null,
  ]);

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit), filterUser });
}
