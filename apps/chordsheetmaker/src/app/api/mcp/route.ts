import { createHash, timingSafeEqual } from "node:crypto";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMcpServer } from "@/lib/mcpServer";

// An MCP server: the address an AI client (Claude Code, say) is pointed at to
// get the tools in lib/mcpServer.ts. For the owner alone.
//
// Whoever holds MCP_SECRET can read the site's numbers and add songs to the
// owner's library, so the key is checked here, before anything else runs:
//
//   - No MCP_SECRET, or one too short to be a real key: the endpoint is off
//     and answers 503. It never falls open because a variable is missing.
//   - A request without the right key gets 401 and learns nothing else, not
//     even which tools exist.
//
// The key travels in the Authorization header, never in the address, where it
// would end up in logs. A browser cannot be tricked into sending it, since a
// page does not know it, which is why there is no Origin check on top.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Shorter than this is a password, not a key. `openssl rand -hex 32` gives 64. */
const MIN_KEY_LENGTH = 32;

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Compares in constant time, so the answer's timing says nothing about the key. */
function keyMatches(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

const refuse = (status: number, error: string, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers });

const handler = createMcpHandler(
  // Built for each request, so nothing is held between them. It is told where
  // the app is served from, for the links in what the tools say.
  ({ requestInfo }) =>
    createMcpServer(requestInfo ? new URL(requestInfo.url).origin : (process.env.AUTH_URL ?? "https://chordsheetmaker.ai")),
  // One JSON answer per request. Nothing here streams, and a plain answer is
  // what a serverless function is good at.
  { responseMode: "json" },
);

async function serve(request: Request): Promise<Response> {
  const secret = process.env.MCP_SECRET ?? "";
  if (secret.length < MIN_KEY_LENGTH) {
    return refuse(503, "The MCP server is not switched on here.");
  }
  const given = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  if (!given || !keyMatches(given, secret)) {
    return refuse(401, "Unauthorized", { "WWW-Authenticate": "Bearer" });
  }
  return handler.fetch(request);
}

export { serve as GET, serve as POST, serve as DELETE };
