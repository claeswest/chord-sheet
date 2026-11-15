import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ADMIN_USER_SELECT, toAdminUser } from "@/lib/adminUsers";

// Admin-only: one user, in the same shape the users list returns, for the
// user's own page (/admin/users/<id>).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: ADMIN_USER_SELECT });
  if (!user) return NextResponse.json({ error: "No such user" }, { status: 404 });

  return NextResponse.json({ user: toAdminUser(user) });
}
