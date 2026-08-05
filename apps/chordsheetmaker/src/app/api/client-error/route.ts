import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/reportError";

// Receives error reports from the client (React error boundaries, etc.) and
// funnels them through the same reporter as server errors.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    await reportError({
      source: "client",
      message: typeof body.message === "string" ? body.message.slice(0, 1000) : "Unknown client error",
      stack: typeof body.stack === "string" ? body.stack.slice(0, 4000) : undefined,
      path: typeof body.path === "string" ? body.path : undefined,
      context: {
        digest: body.digest,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });
  } catch {
    // Swallow — reporting must never error.
  }
  // Always 204 so the client never blocks on reporting.
  return new NextResponse(null, { status: 204 });
}
