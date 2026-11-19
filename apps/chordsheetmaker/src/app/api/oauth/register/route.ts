import { notHere, oauthError, openJson, preflight, readClientDescription, userAccessOn } from "@/lib/oauth";
import { registerAppClient } from "@/lib/appClients";

// An app introducing itself the older way (RFC 7591): it posts its name and
// where a person may be sent back to, and is given an id. The MCP
// specification now prefers that an app identifies itself by a web address
// instead (see lib/appClients.ts) and calls this way deprecated; it is here
// for the apps that have not moved yet.
//
// Anyone can call this without signing in. All it earns them is an id that
// does nothing until a signed-in person looks at the Allow page and says yes.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!userAccessOn()) return notHere();

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 20_000) return oauthError(400, "invalid_client_metadata", "The registration is too large.");
    body = JSON.parse(text);
  } catch {
    return oauthError(400, "invalid_client_metadata", "The registration must be JSON.");
  }

  const described = readClientDescription(body, { nameRequired: false });
  if (typeof described === "string") {
    return oauthError(400, described.includes("redirect_uri") ? "invalid_redirect_uri" : "invalid_client_metadata", described);
  }

  const client = await registerAppClient(described.name, described.redirectUris);
  if (!client) return oauthError(429, "temporarily_unavailable", "Too many apps have registered lately. Try again later.");

  return openJson(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201,
  );
}

export const OPTIONS = () => preflight("POST, OPTIONS");
