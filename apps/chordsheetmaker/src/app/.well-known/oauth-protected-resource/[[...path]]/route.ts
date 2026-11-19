import { notHere, openJson, originOf, preflight, protectedResourceDocument, userAccessOn } from "@/lib/oauth";

// Discovery, part one: which server hands out keys for /api/mcp. An app that
// was refused there is given this address in the refusal. Apps that were not
// told look in two places, with the MCP server's path on the end and without,
// so both are answered: /.well-known/oauth-protected-resource[/api/mcp].

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  if (!userAccessOn()) return notHere();
  const path = (await params).path?.join("/") ?? "";
  if (path !== "" && path !== "api/mcp") return notHere();
  return openJson(protectedResourceDocument(originOf(request)));
}

export const OPTIONS = () => preflight("GET, OPTIONS");
