import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { canUseFeature, planFromUser } from "@/lib/plans";
import {
  authorizeProblem, notHere, originOf, readAuthorizeRequest, returnAddressAllowed, returnTo, userAccessOn,
} from "@/lib/oauth";
import { findAppClient } from "@/lib/appClients";
import { issueCode } from "@/lib/connectedApps";

// Where the Allow page's two buttons post to. Nothing on that page is trusted
// here: everything it showed is worked out again from the request, as the same
// signed-in person, before a code is made. The page is only how a person says
// yes; this is where yes takes effect.
//
// It is a plain form post and a plain redirect, rather than a server action,
// because the person has to end up at another site (the app's) and a real
// HTTP redirect is the one way that always works.

export const dynamic = "force-dynamic";

const refuse = (status: number, message: string) => new Response(message, { status });

export async function POST(request: Request) {
  if (!userAccessOn()) return notHere();
  const origin = originOf(request);

  // Only our own page may post here. The sign-in cookie is not sent with a
  // form posted from another site either, but this does not depend on that.
  if (request.headers.get("origin") !== origin) return refuse(403, "This form can only be sent from the site itself.");

  const session = await auth();
  if (!session?.user?.id) return refuse(401, "You are no longer signed in. Go back to the app and connect again.");

  const form = await request.formData();
  const ask = readAuthorizeRequest((key) => form.get(key));
  const problem = authorizeProblem(ask, origin);
  if (problem) return refuse(400, problem);

  const client = await findAppClient(ask.client_id!);
  // Until the app and its return address check out, nobody is sent anywhere.
  if (!client || !returnAddressAllowed(ask.redirect_uri!, client.redirectUris)) {
    return refuse(400, "The app could not be recognised. Go back to it and connect again.");
  }

  const back = (answer: Record<string, string | undefined>) =>
    // 303: the browser follows with a GET, whatever it posted here.
    new Response(null, {
      status: 303,
      headers: { Location: returnTo(ask.redirect_uri!, { ...answer, state: ask.state, iss: origin }), "Cache-Control": "no-store" },
    });

  if (form.get("decision") !== "allow") {
    return back({ error: "access_denied", error_description: "The request was declined." });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true, stripeSubscriptionId: true, stripeCurrentPeriodEnd: true, stripeSubscriptionStatus: true },
  });
  if (!user || !canUseFeature(planFromUser(user), "aiApps")) {
    return back({ error: "access_denied", error_description: "This account's plan does not include connecting apps." });
  }

  const code = await issueCode(user.id, client, ask.redirect_uri!, ask.code_challenge!);
  await logActivity("app_connected", user.id, { app: client.name });
  return back({ code });
}
