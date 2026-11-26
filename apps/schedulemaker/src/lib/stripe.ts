import Stripe from "stripe";
import { plusPriceId } from "./plans";

// Stripe, for selling Plus. The same shape as the other two apps' lib/stripe.ts.
// Like them, this app has a Stripe account of its own, so the name on a buyer's
// receipt is this product's. In it there is one price, named by
// STRIPE_PRICE_PLUS.
//
// Lazy, not module-scope: importing this file must not throw when the key is
// absent. A deployment without Stripe is a valid one — Plus is then simply not
// for sale, and the Plus page asks who wants it instead (see `sellingEnabled`).

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      ...standIn(),
    });
  }
  return _stripe;
}

/**
 * On a laptop, a stand-in for Stripe.
 *
 * The only Stripe key in this repository's .env files is a live one, and a
 * checkout cannot be tried against that. STRIPE_API_BASE points the client at
 * something else instead — a few lines of local server that answer like
 * Stripe. Never read in production: there the client talks to Stripe and
 * nothing else, whatever this setting says.
 */
function standIn(): { host?: string; port?: number; protocol?: "http" | "https" } {
  const base = process.env.STRIPE_API_BASE;
  if (!base || process.env.NODE_ENV === "production") return {};
  const url = new URL(base);
  return {
    host: url.hostname,
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
    protocol: url.protocol === "https:" ? "https" : "http",
  };
}

/**
 * Whether Plus can be bought here.
 *
 * All three settings or nothing. The webhook secret is in the list on
 * purpose: without it a payment would go through and nothing would ever tell
 * this app that it stopped — or, if the buyer closed the tab on the way back,
 * that it started. A buy button that takes money and gives nothing is worse
 * than no button.
 */
export function sellingEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && plusPriceId(),
  );
}

export type PlusPrice = {
  /** In the currency's smallest unit: öre. */
  amount: number;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  /** The amount is what the buyer pays, VAT in it. Only said when Stripe says so. */
  taxIncluded: boolean;
};

const PRICE_TTL_MS = 10 * 60 * 1000;
let cachedPrice: { at: number; id: string; price: PlusPrice } | null = null;

/**
 * What Plus costs, read from Stripe.
 *
 * The figure lives in one place, the price in Stripe, and this page shows
 * that. Written into the code as well it would be a second copy, and the day
 * the two differ the page promises one sum and the card is charged another.
 * It also means the owner sets or changes the price without a deployment.
 *
 * Null when Plus is not for sale, when Stripe cannot be reached, or when the
 * price is not a subscription. Kept for ten minutes per server instance.
 */
export async function plusPrice(): Promise<PlusPrice | null> {
  const id = plusPriceId();
  if (!sellingEnabled() || !id) return null;
  if (cachedPrice && cachedPrice.id === id && Date.now() - cachedPrice.at < PRICE_TTL_MS) {
    return cachedPrice.price;
  }
  try {
    const p = await getStripe().prices.retrieve(id);
    if (!p.active || !p.recurring || p.unit_amount == null) return null;
    const price: PlusPrice = {
      amount: p.unit_amount,
      currency: p.currency,
      interval: p.recurring.interval,
      intervalCount: p.recurring.interval_count,
      taxIncluded: p.tax_behavior === "inclusive",
    };
    cachedPrice = { at: Date.now(), id, price };
    return price;
  } catch (e) {
    console.error(`[stripe] could not read the Plus price: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** "49 kr per månad", in Swedish, from what Stripe holds. */
export function priceInWords(price: PlusPrice): string {
  const sum = new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    // 49 kr, not 49,00 kr — but 49,50 kr keeps its öre.
    minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100);
  const unit = { day: "dag", week: "vecka", month: "månad", year: "år" }[price.interval];
  const every =
    price.intervalCount === 1
      ? `per ${unit}`
      : `var ${price.intervalCount}:e ${unit}`;
  return `${sum} ${every}`;
}
