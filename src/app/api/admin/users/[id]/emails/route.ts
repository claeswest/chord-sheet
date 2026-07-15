import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Admin-only: a user's marketing-email history, derived from the activity log
// (each send records its template there). Shown when a user row is expanded.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const rows = await prisma.activityLog.findMany({
    where: { userId: id, type: "marketing_email" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, createdAt: true, meta: true },
  });

  const emails = rows.map((r) => ({
    id: r.id,
    sentAt: r.createdAt,
    template:
      typeof (r.meta as Record<string, unknown> | null)?.template === "string"
        ? ((r.meta as Record<string, unknown>).template as string)
        : "unknown",
  }));

  return NextResponse.json({ emails });
}
