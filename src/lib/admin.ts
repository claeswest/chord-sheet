import { auth } from "@/lib/auth";

/**
 * Returns true if the current session user is an admin.
 * Admins are defined by the ADMIN_EMAILS env var (comma-separated).
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(session.user.email.toLowerCase());
}
