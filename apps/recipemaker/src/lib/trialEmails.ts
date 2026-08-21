// What the trial emails say, and when each one is due.
//
// No database, no network: given a person and a template this returns text.
// Split out from lifecycleEmail.ts so the copy can be read, rendered and
// checked without touching Prisma — the same reason ChordSheetMaker keeps
// marketingRules.ts apart from marketing.ts.

import { PLANS } from "./plans";
import type { EmailBrand, EmailContent } from "@clavos/core/email-template";

export const BASE_URL = "https://recipebookmaker.com";

/**
 * The app's own chrome, in an inbox — see globals.css.
 *
 * Not the slab of paprika you'd expect from a brand colour. The site is warm
 * paper with red used sparingly, and the wordmark puts the red on "Book"
 * specifically; on a red masthead that distinction disappears, and the email
 * stops looking like the product it came from.
 */
export const BRAND: EmailBrand = {
  product: "RecipeBookMaker",
  accent: "#b4432a",
  headerBackground: "#fdf2e3",
  headerHtml: `<span style="font-size:20px;font-weight:800;color:#191410;letter-spacing:-0.01em;">Recipe<span style="color:#b4432a;">Book</span>Maker</span>`,
  pageBackground: "#f4efe6",
  signOff: "— Claes, RecipeBookMaker",
};

export const TRIAL_EMAILS = ["trial_tips", "trial_ending"] as const;
export type TrialEmail = (typeof TRIAL_EMAILS)[number];

/** The activity type recording that one of these went out. */
export const eventType = (t: TrialEmail) => `email_${t}`;

/**
 * Slack at the top of every window, so consecutive runs overlap.
 *
 * Vercel Cron on the Hobby plan has an hour of play in when it fires. Two
 * 24-hour windows only tile perfectly if the job runs at the same moment every
 * day: run at 09:05 and then 09:58, and the second window starts 53 minutes
 * after the first one ended. Anyone whose charge date falls in that gap gets
 * nothing, silently, which is the exact failure the wide windows were meant to
 * rule out.
 *
 * Overlapping instead of tiling costs nothing, because the activity log
 * already makes a second send impossible. Two hours covers the plan's stated
 * jitter with room to spare.
 */
const CRON_JITTER_DAYS = 2 / 24;

/**
 * How many days before the first payment this email goes out, as a window.
 *
 * A window rather than an instant because the job runs once a day: "two days
 * left" has to mean "somewhere in the 24 hours that are two days out".
 */
export function daysBeforeCharge(t: TrialEmail): [from: number, to: number] {
  // A seven-day trial: tips on day one or two, while there's still a week to
  // use them; the warning two clear days out, which is enough time to cancel
  // without the email arriving so early that it gets forgotten.
  //
  // [2, 3) rather than [1, 2) so the notice is 48–72 hours. At [1, 2) someone
  // whose trial ends the hour before the next run would get 24 hours exactly,
  // and the email says "two days".
  //
  // The slack goes on the top, which is the end that means "more days left"
  // and so sends slightly sooner. Putting it on the bottom would close the
  // same gap, but by sending later — and that would shave the trial warning
  // under 48 hours. When a billing notice can err, it should err early.
  const [from, to] = t === "trial_tips" ? [5, 6] : [2, 3];
  return [from, to + CRON_JITTER_DAYS];
}

/**
 * Whether this is a service message rather than marketing.
 *
 * "Your trial ends on Friday and you'll be charged $5" is a fact about a
 * subscription someone has entered into, not a pitch. It goes out even to
 * people who opted out of marketing, and carries no unsubscribe link — the
 * alternative is an unexpected charge, which is worse for them than an email
 * they didn't want. The tips email is marketing and obeys the opt-out.
 */
export const isTransactional = (t: TrialEmail) => t === "trial_ending";

export type Recipient = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  recipes: number;
  trialEndsAt: Date;
};

const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function trialEmailContent(t: TrialEmail, u: Recipient): EmailContent {
  const name = (u.name ?? "").split(" ")[0] || "there";

  // Only stated when the plan is one we can price. A wrong amount in a billing
  // notice is worse than no amount, and "monthly" is not a safe default for a
  // row that says something unexpected.
  const amount =
    u.plan === "yearly"
      ? `$${PLANS.yearly.price} for the year`
      : u.plan === "monthly"
        ? `$${PLANS.monthly.price}`
        : null;

  if (t === "trial_tips") {
    return {
      subject: "Three things worth trying this week 🍋",
      preheader: "Photograph a card, let the AI illustrate it, cook from your phone.",
      name,
      intro:
        u.recipes > 0
          ? `You've made a start${u.recipes === 1 ? " — one recipe in" : ` — ${u.recipes} recipes in`}. Three things people tend to find late and wish they'd found first:`
          : "Your trial is running, so here are the three things worth doing first — none of them take more than a minute:",
      items: [
        [
          "Photograph a recipe card",
          "a handwritten card, a magazine page, a screenshot — it comes back typed up and editable",
        ],
        [
          "Let it illustrate itself",
          "one click gives the recipe a picture that matches the dish, and step pictures if you want them",
        ],
        [
          "Cook from it",
          "open Cook view on a phone or tablet — big type, no clutter, and the screen stays awake",
        ],
      ],
      ctaLabel: "Open your recipes →",
      ctaUrl: `${BASE_URL}/recipes`,
      footnote:
        "Stuck on anything? Just reply — this reaches me directly, and I answer every one.",
    };
  }

  // trial_ending — the honest heads-up, two days out.
  return {
    subject: `Your trial ends ${day(u.trialEndsAt)}`,
    preheader: `First payment ${day(u.trialEndsAt)} — or cancel before then, no charge.`,
    name,
    intro: `A heads-up rather than a surprise on your statement: your free trial ends on ${day(u.trialEndsAt)}, and that's when the first payment${amount ? ` of ${amount}` : ""} would go through. Nothing has been charged so far.`,
    items: [
      ["Happy to carry on", "you needn't do anything — it renews by itself"],
      ["Not for you", "cancel from Billing before that date and you won't be charged at all"],
      [
        "Your recipes stay yours",
        u.recipes > 0
          ? `all ${u.recipes} of them stay in your account either way, and you can print or export them whenever`
          : "whatever you write stays in your account either way",
      ],
    ],
    ctaLabel: "Manage your subscription →",
    ctaUrl: `${BASE_URL}/pricing`,
    footnote:
      "If something got in the way of giving it a proper try, reply and tell me — I'd rather fix it than take your money.",
  };
}
