import { SCOPE, isOurResource, notHere, oauthError, openJson, originOf, preflight, userAccessOn } from "@/lib/oauth";
import { redeemCode, refreshKeys, type Keys } from "@/lib/connectedApps";

// Where an app collects its keys: once with the code from the Allow page, and
// from then on with its refresh key whenever the short-lived one runs out.
//
// The app has no password of its own to show here. What proves it is the app
// the person said yes to is the PKCE verifier (for a code) or holding the
// refresh key (for a refresh), both checked in lib/connectedApps.ts.

export const dynamic = "force-dynamic";

const keysAnswer = (keys: Keys) =>
  openJson({
    access_token: keys.accessToken,
    token_type: "Bearer",
    expires_in: keys.expiresInSeconds,
    refresh_token: keys.refreshToken,
    scope: SCOPE,
  });

export async function POST(request: Request) {
  if (!userAccessOn()) return notHere();

  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return oauthError(400, "invalid_request", "The request could not be read.");
  }
  const field = (name: string) => form.get(name) || undefined;

  const clientId = field("client_id");
  if (!clientId) return oauthError(400, "invalid_request", "client_id is required.");
  if (!isOurResource(field("resource"), originOf(request))) {
    return oauthError(400, "invalid_target", "Keys from here are only for this site's MCP server.");
  }

  const grant = field("grant_type");

  if (grant === "authorization_code") {
    const code = field("code");
    const codeVerifier = field("code_verifier");
    if (!code || !codeVerifier) return oauthError(400, "invalid_request", "code and code_verifier are required.");
    const keys = await redeemCode({ code, clientId, redirectUri: field("redirect_uri"), codeVerifier });
    // One answer for every way a code can be wrong, so nothing is learned by trying.
    return keys ? keysAnswer(keys) : oauthError(400, "invalid_grant", "The code is not valid. Start connecting again.");
  }

  if (grant === "refresh_token") {
    const refreshToken = field("refresh_token");
    if (!refreshToken) return oauthError(400, "invalid_request", "refresh_token is required.");
    const keys = await refreshKeys(refreshToken, clientId);
    return keys ? keysAnswer(keys) : oauthError(400, "invalid_grant", "The connection has ended. Connect the app again.");
  }

  return oauthError(400, "unsupported_grant_type", "Only authorization_code and refresh_token are offered.");
}

export const OPTIONS = () => preflight("POST, OPTIONS");
