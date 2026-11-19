import { authorizationServerDocument, notHere, openJson, originOf, preflight, userAccessOn } from "@/lib/oauth";

// Discovery, part two: how an app gets a key here. An app finds this address
// from the other document, next door in oauth-protected-resource.

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  if (!userAccessOn()) return notHere();
  return openJson(authorizationServerDocument(originOf(request)));
}

export const OPTIONS = () => preflight("GET, OPTIONS");
