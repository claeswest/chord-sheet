// The shape of the admin dashboard's numbers, and the constants the page and
// the server both need. Kept apart from adminInsights.ts, which talks to the
// database and must never be bundled for the browser.

/**
 * Rough cost of one AI request, in US dollars. Estimates, for a sense of
 * scale — the bill is at the provider. Basis (checked November 2026): Gemini
 * Flash text at about $0.30 per million tokens in and $2.50 out, a request
 * here being a few thousand tokens; an image at about $0.039, plus the short
 * text request that writes its prompt.
 */
export const AI_COST_USD = {
  search: 0.005,
  paste: 0.004,
  photo: 0.003,
  style: 0.002,
  picture: 0.04,
} as const;
export type AiKind = keyof typeof AI_COST_USD;
export const AI_KINDS = Object.keys(AI_COST_USD) as AiKind[];

export interface Person {
  id: string;
  name: string | null;
  email: string | null;
}

export interface AdminInsights {
  attention: {
    /** Trials that convert (and charge) within three days. */
    trialsEnding: (Person & { plan: string; at: string })[];
    /** Subscriptions whose last payment failed. */
    paymentProblems: (Person & { plan: string; status: string })[];
    /** Cancelled, access still running. Soonest first. */
    cancelling: (Person & { plan: string; at: string })[];
    /** Free accounts that reached the song limit in the last two weeks. */
    atLimit: (Person & { songs: number; at: string })[];
  };
  emailJob: {
    /** The last recorded run. null until the first run after run records began. */
    lastRun: { at: string; due: number; sent: number; failed: number; skipped: number; dryRun: boolean } | null;
    /** When an automatic email last actually went out. */
    lastAutoEmailAt: string | null;
    sent7d: { auto: number; manual: number };
    /** What a run right now would send. null if that could not be worked out. */
    dueNow: number | null;
    /** Automatic emails per day, oldest first, 14 days. */
    daily: { day: string; n: number }[];
  };
  funnel: {
    days: number;
    guestsWithSong: number;
    signups: number;
    signupsWithSong: number;
    trials: number;
    paid: number;
  };
  guests: {
    days: number;
    visitors: number;
    songs: number;
    styled: number;
    accountSongs: number;
    weekly: { week: string; visitors: number; songs: number }[];
  };
  ai: {
    days: number;
    kinds: Record<AiKind, { guests: number; accounts: number }>;
    daily: { day: string; n: number }[];
    estimateUsd: number;
    /** First row of the newer logging: before it, imports and visitors were not counted. */
    countedSince: string | null;
  };
  /** Where the people active in the period were, most accounts first. */
  countries: {
    days: number;
    rows: { code: string; accounts: number; visitors: number }[];
  };
  trends: {
    weeks: string[];
    signups: number[];
    songs: number[];
    guestSongs: number[];
    trials: number[];
  };
}
