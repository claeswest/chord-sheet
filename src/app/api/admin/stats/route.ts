import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalUsers, totalSongs, totalCategories, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.song.count(),
    prisma.category.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        plan: true,
        createdAt: true,
        _count: { select: { songs: true } },
      },
    }),
  ]);

  // Songs created in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newSongsThisWeek = await prisma.song.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });
  const newUsersThisWeek = await prisma.user.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  return NextResponse.json({
    totalUsers,
    totalSongs,
    totalCategories,
    newSongsThisWeek,
    newUsersThisWeek,
    recentUsers,
  });
}
