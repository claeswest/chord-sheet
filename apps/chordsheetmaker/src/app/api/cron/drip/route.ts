import { NextRequest, NextResponse } from "next/server";
import { runAutoDrip } from "@/lib/autoDrip";
import { notifyAdmin } from "@/lib/notify";

// The daily job behind the automatic part of the email drip. Scheduled in
// vercel.json; who gets what is lib/autoDrip.ts and lib/marketingRules.ts.
//
// Authorisation is mandatory, not optional: this endpoint sends mail to
// customers, so an unprotected one is a spam cannon with your domain on it.
// With no CRON_SECRET configured it refuses to run at all rather than falling
// open — a job that quietly never fires is a much smaller problem than one
// anybody can fire.
//
// GET because that is what Vercel Cron issues.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Anywhere but production this only ever reports what it would send. The dev
  // database starts life as a snapshot of the real one, and Resend is the real
  // service: a "test run" on a laptop with the key set would email customers.
  // ?dry=1 asks for the same report in production.
  const dryRun =
    process.env.VERCEL_ENV !== "production" || req.nextUrl.searchParams.get("dry") === "1";

  const run = await runAutoDrip({ dryRun });

  // Logged as well as returned: cron output is visible in Vercel's logs, and
  // that is where you look when someone asks why they didn't get an email.
  console.log("[cron/drip]", JSON.stringify(run));

  // Every email that goes out is copied to the founder, so success announces
  // itself. Failure is the one thing that would otherwise be silent.
  if (run.failed > 0) {
    await notifyAdmin(`Automatic emails: ${run.failed} failed to send`, [
      `Today's run owed ${run.due} email${run.due === 1 ? "" : "s"}: ${run.sent} sent, ${run.failed} failed, ${run.skipped} skipped.`,
      "Nothing is lost — whoever was missed is picked up by tomorrow's run.",
      "The details are in Vercel's logs, under [cron/drip].",
    ]);
  }

  return NextResponse.json({ ok: true, ...run });
}
