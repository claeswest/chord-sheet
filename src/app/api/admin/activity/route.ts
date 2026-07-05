import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

// Admin-only: paginated activity feed with type/user/date/text filters.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = 50;
  const type = sp.get("type")?.trim();
  const userId = sp.get("userId")?.trim();
  const q = sp.get("q")?.trim();
  const from = sp.get("from")?.trim();
  const to = sp.get("to")?.trim();

  const where: Prisma.ActivityLogWhereInput = {};
  if (type) where.type = type;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    // include the whole "to" day
    if (to) where.createdAt.lte = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { meta: { path: ["title"], string_contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
  ]);

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
}
