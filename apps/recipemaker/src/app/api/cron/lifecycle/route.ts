import { NextRequest, NextResponse } from "next/server";
import { runTrialEmails } from "@/lib/lifecycleEmail";

// The daily job behind the trial emails. Scheduled in vercel.json.
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

  const results = await runTrialEmails();

  // Logged as well as returned: cron output is visible in Vercel's logs, and
  // that is where you look when someone asks why they didn't get an email.
  console.log("[cron/lifecycle]", JSON.stringify(results));

  return NextResponse.json({ ok: true, results });
}
