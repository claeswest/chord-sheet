import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth";
import { getStripe, sellingEnabled } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { plusPriceId } from "@/lib/plans";
import { logActivity } from "@/lib/activity";

// POST /api/stripe/checkout — start buying Plus.
//
// Answers with an address at Stripe to send the browser to. The card is typed
// there; nothing about it passes through this app. The account is not on Plus
// when this returns, nor when the buyer comes back: only Stripe saying the
// subscription is paid makes it so (lib/subscription.ts).
//
// The price is this server's setting. Nothing the browser sends is read: there
// is one thing to buy.

export async function POST(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });

  const price = plusPriceId();
  if (!sellingEnabled() || !price) {
    return NextResponse.json({ error: "Plus går inte att köpa än." }, { status: 503 });
  }
  if (account.plan === "plus") {
    return NextResponse.json({ error: "Du har redan Plus." }, { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: account.id },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!user) return NextResponse.json({ error: "Du behöver logga in." }, { status: 401 });
  // A subscription that is not paying but not over either (the card failed for
  // good, say). A second one beside it would be two to keep track of; the way
  // forward is to pay or end the first.
  if (user.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Du har redan ett abonnemang. Öppna Hantera abonnemang för att betala eller avsluta det." },
      { status: 409 },
    );
  }

  const base = process.env.AUTH_URL ?? req.nextUrl.origin;

  try {
    const stripe = getStripe();

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: account.email,
        // The Stripe account is shared with the owner's other sites. This is
        // what says which of them a customer belongs to.
        metadata: { app: "schedulemaker", userId: account.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: account.id }, data: { stripeCustomerId: customerId } });
    }

    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      locale: "sv",
      // VAT follows the buyer's country, so Stripe works out the rate — and
      // can only do that once it knows where the buyer is. Same three lines as
      // the other two apps; see apps/recipemaker's checkout for the reasons.
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      billing_address_collection: "auto",
      // Stripe puts the session's id in place of the braces. The Plus page
      // uses it to turn Plus on without waiting for the webhook.
      success_url: `${base}/plus?klart={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/plus`,
      client_reference_id: account.id,
      subscription_data: { metadata: { app: "schedulemaker", userId: account.id } },
    });

    if (!checkout.url) throw new Error("Stripe returned no address");
    await logActivity("checkout_started", account.id);
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    console.error(`[stripe] checkout failed: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json(
      { error: "Det gick inte att öppna betalningen. Försök igen om en stund." },
      { status: 502 },
    );
  }
}
