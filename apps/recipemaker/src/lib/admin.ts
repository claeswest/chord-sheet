import { auth } from "@/lib/auth";

/**
 * Whether the signed-in user runs this product.
 *
 * ADMIN_EMAILS, the same list that receives subscription notifications — the
 * people who get told when a customer arrives are the people who should be
 * able to look. One list, so it cannot drift into two.
 *
 * A near-copy of ChordSheetMaker's rather than shared code: this reads the
 * session, and packages/core is forbidden from importing auth. That rule is
 * worth more than ten lines of deduplication.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return false;

  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
