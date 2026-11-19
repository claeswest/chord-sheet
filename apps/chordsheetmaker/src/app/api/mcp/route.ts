import { createHash, timingSafeEqual } from "node:crypto";
import {
  OAuthError, OAuthErrorCode, bearerAuthChallengeResponse, createMcpHandler, verifyBearerToken, type AuthInfo,
} from "@modelcontextprotocol/server";
import { createMcpServer, type McpCaller } from "@/lib/mcpServer";
import { SCOPE, mcpUrl, originOf, protectedResourceUrl, userAccessOn } from "@/lib/oauth";
import { holderOf } from "@/lib/connectedApps";

// An MCP server: the address an AI client (Claude, ChatGPT) is pointed at to
// get the tools in lib/mcpServer.ts. There are two doors, and what is behind
// each is different:
//
//   - The owner's key, MCP_SECRET. Whoever holds it can read the site's numbers
//     and add songs to the owner's library. One long key, sent by Claude Code.
//   - A key an app was given when a person signed it in to their own account
//     (lib/oauth.ts). It opens that person's songs and nothing else. This door
//     exists only while MCP_USER_ACCESS is "on".
//
// Whichever it is gets checked here, before anything else runs:
//
//   - With neither door switched on the endpoint is off and answers 503. It
//     never falls open because a variable is missing. An MCP_SECRET too short
//     to be a real key counts as missing.
//   - A request without a valid key gets 401 and learns nothing else, not even
//     which tools exist. When the second door is open the 401 also says where
//     an app can go to be signed in, which is how apps find out.
//
// A key travels in the Authorization header, never in the address, where it
// would end up in logs. A browser cannot be tricked into sending one, since a
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

/** What the handler is told about a request that came with the owner's key. */
const OWNER: AuthInfo = { token: "", clientId: "owner-key", scopes: [], extra: { owner: true } };

/**
 * Who a checked request is from. Both doors say so in `extra`; a request that
 * says neither was never checked, and gets no server at all.
 */
function callerOf(authInfo: AuthInfo | undefined): McpCaller {
  if (authInfo?.extra?.owner === true) return { owner: true };
  const userId = authInfo?.extra?.userId;
  if (typeof userId === "string" && userId) return { userId };
  throw new Error("An MCP request reached the server without having been checked.");
}

const handler = createMcpHandler(
  // Built for each request, so nothing is held between them. It is told where
  // the app is served from, for the links in what the tools say.
  ({ requestInfo, authInfo }) =>
    createMcpServer(
      requestInfo ? new URL(requestInfo.url).origin : (process.env.AUTH_URL ?? "https://chordsheetmaker.ai"),
      callerOf(authInfo),
    ),
  // One JSON answer per request. Nothing here streams, and a plain answer is
  // what a serverless function is good at.
  { responseMode: "json" },
);

async function serve(request: Request): Promise<Response> {
  const secret = process.env.MCP_SECRET ?? "";
  const ownerDoor = secret.length >= MIN_KEY_LENGTH;
  const userDoor = userAccessOn();
  if (!ownerDoor && !userDoor) return refuse(503, "The MCP server is not switched on here.");

  const authorization = request.headers.get("authorization");
  const given = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";

  if (ownerDoor && given && keyMatches(given, secret)) {
    return handler.fetch(request, { authInfo: OWNER });
  }

  if (!userDoor) return refuse(401, "Unauthorized", { "WWW-Authenticate": "Bearer" });

  // The second door: a key from a signed-in app. The refusal carries the
  // address of the document that tells an app how to get one.
  const origin = originOf(request);
  const challenge = { resourceMetadataUrl: protectedResourceUrl(origin), requiredScopes: [SCOPE] };
  try {
    const authInfo = await verifyBearerToken(authorization, {
      ...challenge,
      // A key is only good for this server (it could not have been issued for
      // another, but the check is the specification's and costs nothing).
      expectedResource: new URL(mcpUrl(origin)),
      verifier: {
        async verifyAccessToken(token) {
          const holder = await holderOf(token);
          if (!holder) throw new OAuthError(OAuthErrorCode.InvalidToken, "The key is not valid or has expired.");
          return {
            token,
            clientId: holder.clientId,
            scopes: [SCOPE],
            expiresAt: Math.floor(holder.expiresAt.getTime() / 1000),
            resource: new URL(mcpUrl(origin)),
            extra: { userId: holder.userId },
          };
        },
      },
    });
    return handler.fetch(request, { authInfo });
  } catch (e) {
    if (!(e instanceof OAuthError)) console.error("[mcp] key check failed", e);
    return bearerAuthChallengeResponse(e, challenge);
  }
}

export { serve as GET, serve as POST, serve as DELETE };
