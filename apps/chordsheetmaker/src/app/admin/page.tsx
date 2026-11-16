"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import PlanBadge from "@/components/admin/PlanBadge";
import { Bars, Funnel } from "@/components/admin/Charts";
import {
  Avatar, BADGE, CARD, ErrorBox, LABEL, LINK, Loading, PageHeader, ROW, TH, TONE,
  countryName, fmtDate, fmtDateTime, fmtDay, relativeTime, untilLabel,
} from "@/components/admin/ui";
import { AI_COST_USD, AI_KINDS, type AdminInsights, type AiKind, type Person } from "@/lib/adminInsightsShared";

interface Stats {
  insights: AdminInsights | null;
  insightsError: string | null;
  totalUsers: number;
  totalSongs: number;
  totalCategories: number;
  newSongsThisWeek: number;
  newUsersThisWeek: number;
  subscriptions: {
    paying: number;
    trialing: number;
    /** Cancelled, still inside the paid-up period. Not in paying or mrr. */
    cancelling: number;
    free: number;
    mrr: number;
    trialMrr: number;
    cancellingMrr: number;
  };
  recentUsers: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    plan: string | null;
    stripeSubscriptionStatus: string | null;
    stripeCurrentPeriodEnd: string | null;
    stripeCancelAt: string | null;
    createdAt: string;
    _count: { songs: number };
  }[];
}

const who = (p: Person) => p.name ?? p.email ?? "Unknown";
const userHref = (id: string) => `/admin/users/${encodeURIComponent(id)}`;

function StatCard({ label, value, sub, tone = "plain", href }: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "plain" | "good" | "warn" | "bad";
  /** Where the number comes from: the matching tab on the users list. */
  href?: string;
}) {
  const edge = tone === "good" ? "border-l-emerald-600" : tone === "warn" ? "border-l-amber-500" : tone === "bad" ? "border-l-red-600" : "border-l-rule";
  const body = (
    <>
      <p className={LABEL}>{label}</p>
      <p className="font-display text-4xl leading-none text-ink mt-3 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-2">{sub}</p>}
    </>
  );
  const cls = `${CARD} border-l-4 ${edge} p-5 block`;
  return href ? (
    <Link href={href} className={`${cls} hover:border-ink/40 transition-colors`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Section({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${CARD} p-5 sm:p-6 ${className}`}>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="font-display font-medium text-xl tracking-[-0.01em] text-ink">{title}</h2>
        {aside && <span className="text-xs text-stone-500 text-right">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

// ── 1 · Who needs attention ──────────────────────────────────────────────────

function Attention({ a }: { a: AdminInsights["attention"] }) {
  type Line = { key: string; tone: keyof typeof TONE; tag: string; person: Person; text: ReactNode };
  const lines: Line[] = [
    ...a.paymentProblems.map((p) => ({
      key: `pay-${p.id}`, tone: "bad" as const, tag: "Payment failed", person: p,
      text: <>The last charge for their {p.plan} plan did not go through ({p.status.replace("_", " ")}).</>,
    })),
    ...a.trialsEnding.map((p) => ({
      key: `trial-${p.id}`, tone: "warn" as const, tag: "Trial ending", person: p,
      text: <>Their {p.plan} trial converts {untilLabel(p.at)}, on {fmtDate(p.at)}.</>,
    })),
    ...a.cancelling.map((p) => ({
      key: `cancel-${p.id}`, tone: "bad" as const, tag: "Cancelling", person: p,
      text: <>Cancelled their {p.plan} plan; access ends {fmtDate(p.at)}. A good time to ask why.</>,
    })),
    ...a.atLimit.map((p) => ({
      key: `limit-${p.id}`, tone: "info" as const, tag: "At the song limit", person: p,
      text: <>On the free plan with {p.songs} songs; saved the latest {relativeTime(p.at)}. The likeliest to pay.</>,
    })),
  ];

  return (
    <Section title="Needs attention" aside={lines.length ? `${lines.length} ${lines.length === 1 ? "person" : "people"}` : undefined} className="mb-6">
      {lines.length === 0 ? (
        <p className="text-sm text-stone-600">
          Nothing needs you right now: no failed payments, no trials ending in the next three days,
          no pending cancellations, and nobody new at the song limit.
        </p>
      ) : (
        <ul className="-my-1">
          {lines.map((l, i) => (
            <li key={l.key} className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 ${i ? ROW : ""}`}>
              <span className={`${BADGE} ${TONE[l.tone]}`}>{l.tag}</span>
              <Link href={userHref(l.person.id)} className="text-sm font-semibold text-ink hover:underline underline-offset-4">{who(l.person)}</Link>
              <span className="text-sm text-stone-600">{l.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── 2 · The daily emails ─────────────────────────────────────────────────────

function EmailJob({ job }: { job: AdminInsights["emailJob"] }) {
  const run = job.lastRun;
  const hours = run ? (Date.now() - new Date(run.at).getTime()) / 3_600_000 : null;
  // One run a day; more than 26 hours without one means a run was missed.
  const late = hours !== null && hours > 26;
  const state: { tone: keyof typeof TONE; label: string } =
    !run ? { tone: "quiet", label: "No run on record yet" }
    : run.failed > 0 ? { tone: "bad", label: "Some emails failed" }
    : late ? { tone: "bad", label: "Has not run today" }
    : { tone: "good", label: "Running" };

  return (
    <Section title="Automatic emails" aside="Daily at 14:00 UTC">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-stone-700">
        <span className={`${BADGE} ${TONE[state.tone]}`}>{state.label}</span>
        {run ? (
          <span>
            Last run {fmtDateTime(run.at)} ({relativeTime(run.at)}): {run.sent} sent, {run.failed} failed, {run.skipped} skipped, of {run.due} due.
            {run.dryRun && " A dry run: nothing was actually sent."}
          </span>
        ) : (
          <span>
            Runs are recorded from 15 Nov 2026, so the next one will show here.
            {job.lastAutoEmailAt
              ? ` The last automatic email went out ${fmtDateTime(job.lastAutoEmailAt)}.`
              : " No automatic email has gone out yet."}
          </span>
        )}
      </p>

      <dl className="grid grid-cols-3 gap-4 mt-5 mb-5">
        {[
          ["Sent, 7 days", job.sent7d.auto, "by the job"],
          ["By hand, 7 days", job.sent7d.manual, "from the users list"],
          ["Due now", job.dueNow ?? "?", "a run now would send"],
        ].map(([label, value, sub]) => (
          <div key={label as string}>
            <dt className={LABEL}>{label}</dt>
            <dd className="font-display text-3xl leading-none text-ink mt-2 tabular-nums">{value}</dd>
            <dd className="text-xs text-stone-500 mt-1.5">{sub}</dd>
          </div>
        ))}
      </dl>

      <Bars
        values={job.daily.map((d) => d.n)}
        labels={job.daily.map((d, i) => (i === job.daily.length - 1 ? "today" : fmtDay(d.day)))}
        caption="Automatic emails sent per day, last 14 days"
        height={48}
      />
    </Section>
  );
}

// ── 5 · AI use and what it costs ─────────────────────────────────────────────

const AI_LABELS: Record<AiKind, string> = {
  search: "Song search",
  paste: "Pasted text clean-up",
  photo: "Photo read",
  style: "Text style",
  picture: "Background picture",
};

function AiUse({ ai }: { ai: AdminInsights["ai"] }) {
  const total = AI_KINDS.reduce((n, k) => n + ai.kinds[k].guests + ai.kinds[k].accounts, 0);
  return (
    <Section title="AI use" aside={`Last ${ai.days} days`}>
      <div className="flex items-end justify-between gap-6 mb-5">
        <div>
          <p className={LABEL}>Requests</p>
          <p className="font-display text-4xl leading-none text-ink mt-3 tabular-nums">{total}</p>
        </div>
        <div className="text-right">
          <p className={LABEL}>Rough cost</p>
          <p className="font-display text-4xl leading-none text-ink mt-3 tabular-nums">≈ ${ai.estimateUsd.toFixed(2)}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-5">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            <th className="text-left font-medium pb-2">Kind</th>
            <th className="text-right font-medium pb-2">Visitors</th>
            <th className="text-right font-medium pb-2">Accounts</th>
            <th className="text-right font-medium pb-2">Each</th>
            <th className="text-right font-medium pb-2">Cost</th>
          </tr>
        </thead>
        <tbody>
          {AI_KINDS.map((k) => {
            const n = ai.kinds[k].guests + ai.kinds[k].accounts;
            return (
              <tr key={k} className={ROW}>
                <td className="py-2 text-ink">{AI_LABELS[k]}</td>
                <td className="py-2 text-right tabular-nums text-stone-700">{ai.kinds[k].guests}</td>
                <td className="py-2 text-right tabular-nums text-stone-700">{ai.kinds[k].accounts}</td>
                <td className="py-2 text-right tabular-nums text-stone-500">${AI_COST_USD[k]}</td>
                <td className="py-2 text-right tabular-nums text-stone-700">${(n * AI_COST_USD[k]).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Bars
        values={ai.daily.map((d) => d.n)}
        labels={ai.daily.map((d, i) => (i === ai.daily.length - 1 ? "today" : fmtDay(d.day)))}
        caption={`AI requests per day, last ${ai.days} days`}
        height={48}
      />
      <p className="text-xs text-stone-500 mt-3 leading-relaxed">
        The cost is an estimate from typical prices per request, not the bill; your own use is included.
        {" "}
        {ai.countedSince
          ? `Searches, pasted text and photo reads, and everything visitors do, are counted from ${fmtDate(ai.countedSince)}.`
          : "Searches, pasted text and photo reads, and everything visitors do, are counted from 15 Nov 2026; nothing has come in yet."}
      </p>
    </Section>
  );
}

// ── 4 · Visitors without an account ──────────────────────────────────────────

function Guests({ g }: { g: AdminInsights["guests"] }) {
  const allSongs = g.songs + g.accountSongs;
  const share = allSongs > 0 ? Math.round((g.songs / allSongs) * 100) : null;
  const styledShare = g.visitors > 0 ? Math.round((g.styled / g.visitors) * 100) : null;
  return (
    <Section title="Visitors without an account" aside={`Last ${g.days} days`}>
      <dl className="grid grid-cols-3 gap-4 mb-5">
        {[
          ["Visitors", g.visitors, "who did something in the editor"],
          ["Songs made", g.songs, share === null ? "no songs made by anyone" : `${share}% of all songs made`],
          ["Styled a song", g.styled, styledShare === null ? "of visitors" : `${styledShare}% of visitors`],
        ].map(([label, value, sub]) => (
          <div key={label as string}>
            <dt className={LABEL}>{label}</dt>
            <dd className="font-display text-3xl leading-none text-ink mt-2 tabular-nums">{value}</dd>
            <dd className="text-xs text-stone-500 mt-1.5">{sub}</dd>
          </div>
        ))}
      </dl>
      <p className={`${LABEL} mb-2`}>Visitors per week</p>
      <Bars
        values={g.weekly.map((w) => w.visitors)}
        labels={g.weekly.map((w, i) => (i === g.weekly.length - 1 ? "this week" : `week of ${fmtDay(w.week)}`))}
        caption="Visitors without an account per week, last 12 weeks"
        height={56}
      />
      <p className="text-xs text-stone-500 mt-3 leading-relaxed">
        A visitor is one browser, counted by a random id it keeps. The same person on a phone and a
        laptop is two, and is not connected to the account they may create later.
      </p>
    </Section>
  );
}

// ── Where people are ─────────────────────────────────────────────────────────

function Countries({ c }: { c: AdminInsights["countries"] }) {
  const max = Math.max(1, ...c.rows.map((r) => r.accounts + r.visitors));
  return (
    <Section title="Where people are" aside={`Last ${c.days} days`} className="mb-6">
      {c.rows.length === 0 ? (
        <p className="text-sm text-stone-600">
          Nothing yet. The country is recorded each time someone does something in the app, starting
          16 Nov 2026, so this fills in as people come back.
        </p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                <th className="text-left font-medium pb-2">Country</th>
                <th className="text-right font-medium pb-2 w-24">Accounts</th>
                <th className="text-right font-medium pb-2 w-24">Visitors</th>
                <th className="pb-2 w-[40%]" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.code} className={ROW}>
                  <td className="py-2 text-ink">{countryName(r.code)} <span className="font-mono text-[10px] text-stone-400">{r.code}</span></td>
                  <td className="py-2 text-right tabular-nums text-stone-700">{r.accounts}</td>
                  <td className="py-2 text-right tabular-nums text-stone-700">{r.visitors}</td>
                  <td className="py-2 pl-4" aria-hidden>
                    {/* Accounts in ink, visitors in blue, on one scale. */}
                    <div className="flex h-2 rounded-full bg-paper-deep overflow-hidden">
                      <div className="bg-ink" style={{ width: `${(r.accounts / max) * 100}%` }} />
                      <div className="bg-chord ml-[2px]" style={{ width: `${(r.visitors / max) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-stone-500 mt-3 leading-relaxed">
            Counted from where each request came from, recorded since 16 Nov 2026. The bar shows
            accounts in black and visitors without an account in blue. Someone on a VPN or travelling
            shows up where their connection is.
          </p>
        </>
      )}
    </Section>
  );
}

// ── 6 · Trends ───────────────────────────────────────────────────────────────

function Trend({ title, values, weeks }: { title: string; values: number[]; weeks: string[] }) {
  const last = values.length - 1;
  return (
    <div className={`${CARD} p-5`}>
      <p className={LABEL}>{title}</p>
      <p className="mt-3 mb-4 flex items-baseline gap-2">
        <span className="font-display text-3xl leading-none text-ink tabular-nums">{values[last]}</span>
        <span className="text-xs text-stone-500">this week · {values[last - 1] ?? 0} last week</span>
      </p>
      <Bars
        values={values}
        labels={weeks.map((w, i) => (i === last ? "this week" : `week of ${fmtDay(w)}`))}
        caption={`${title} per week, last ${weeks.length} weeks`}
        height={56}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const ins = stats?.insights ?? null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <PageHeader title="Dashboard" sub="How ChordSheetMaker is doing, and who needs you." />

      {loading && <Loading label="Loading the numbers…" />}
      {error && <ErrorBox>{error}</ErrorBox>}

      {stats && (
        <>
          {ins && <Attention a={ins.attention} />}
          {!ins && stats.insightsError && (
            <div className="mb-6">
              <ErrorBox>
                The newer parts of this page could not be worked out ({stats.insightsError}). The head-count below is unaffected.
              </ErrorBox>
            </div>
          )}

          {/* Revenue and subscriptions. Paying, On trial and Cancelling are
              disjoint, and each opens its tab on the users list. */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Monthly revenue"
              value={`$${stats.subscriptions.mrr}`}
              sub={stats.subscriptions.trialMrr > 0 ? `+$${stats.subscriptions.trialMrr} if trials convert` : "recurring, per month"}
              tone="good"
            />
            <StatCard label="Paying" value={stats.subscriptions.paying} sub="active subscriptions" tone="good" href="/admin/users?filter=paying" />
            <StatCard label="On trial" value={stats.subscriptions.trialing} sub="not charged yet" tone={stats.subscriptions.trialing > 0 ? "warn" : "plain"} href="/admin/users?filter=trial" />
            <StatCard
              label="Cancelling"
              value={stats.subscriptions.cancelling}
              sub={stats.subscriptions.cancellingMrr > 0 ? `−$${stats.subscriptions.cancellingMrr}/mo when they end` : "access until the period ends"}
              tone={stats.subscriptions.cancelling > 0 ? "bad" : "plain"}
              href="/admin/users?filter=cancelling"
            />
            <StatCard
              label="Free accounts"
              value={stats.subscriptions.free}
              sub={
                stats.totalUsers > 0
                  ? `${Math.round(((stats.subscriptions.paying + stats.subscriptions.trialing) / stats.totalUsers) * 100)}% of all accounts pay or try`
                  : undefined
              }
            />
          </div>

          {ins && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <EmailJob job={ins.emailJob} />
                <Section title="From visitor to customer" aside={`Last ${ins.funnel.days} days`}>
                  <Funnel
                    steps={[
                      { label: "Visitors who made a song", value: ins.funnel.guestsWithSong },
                      {
                        label: "Accounts created", value: ins.funnel.signups,
                        note: ins.funnel.signups > 0 ? `${ins.funnel.signupsWithSong} of them have saved a song` : undefined,
                      },
                      { label: "Trials started", value: ins.funnel.trials },
                      { label: "Became paying", value: ins.funnel.paid },
                    ]}
                  />
                  <p className="text-xs text-stone-500 mt-4 leading-relaxed">
                    Each step is counted on its own over the period, so a percentage is a rough rate
                    against the step above, not one group followed through. With small numbers it
                    can pass 100%.
                  </p>
                </Section>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <Trend title="New accounts" values={ins.trends.signups} weeks={ins.trends.weeks} />
                <Trend title="Songs saved to accounts" values={ins.trends.songs} weeks={ins.trends.weeks} />
                <Trend title="Songs made by visitors" values={ins.trends.guestSongs} weeks={ins.trends.weeks} />
                <Trend title="Trials started" values={ins.trends.trials} weeks={ins.trends.weeks} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <Guests g={ins.guests} />
                <AiUse ai={ins.ai} />
              </div>

              <Countries c={ins.countries} />
            </>
          )}

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Accounts" value={stats.totalUsers} sub={`+${stats.newUsersThisWeek} in the last 7 days`} href="/admin/users" />
            <StatCard label="Songs in accounts" value={stats.totalSongs} sub={`+${stats.newSongsThisWeek} in the last 7 days`} href="/admin/songs" />
            <StatCard label="Setlists" value={stats.totalCategories} sub="across all accounts" />
            <StatCard
              label="Songs per account"
              value={stats.totalUsers > 0 ? (stats.totalSongs / stats.totalUsers).toFixed(1) : "0"}
              sub="on average"
            />
          </div>

          {/* Recent signups */}
          <div className={`${CARD} overflow-x-auto`}>
            <div className="px-5 py-4 flex items-baseline justify-between">
              <h2 className="font-display font-medium text-xl tracking-[-0.01em] text-ink">Newest accounts</h2>
              <Link href="/admin/users" className={`text-sm ${LINK}`}>All users →</Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className={ROW}>
                  <th className={TH}>User</th>
                  <th className={`${TH} hidden md:table-cell`}>Email</th>
                  <th className={TH}>Songs</th>
                  <th className={TH}>Plan</th>
                  <th className={`${TH} hidden lg:table-cell`}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((user) => (
                  <tr key={user.id} className={`${ROW} hover:bg-paper transition-colors`}>
                    <td className="px-5 py-3">
                      <Link href={userHref(user.id)} className="flex items-center gap-3 group">
                        <Avatar name={user.name ?? user.email ?? "?"} image={user.image} />
                        <span className="font-medium text-ink truncate max-w-[160px] group-hover:underline underline-offset-4">
                          {user.name ?? "—"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-stone-600 hidden md:table-cell truncate max-w-[220px]">{user.email}</td>
                    <td className="px-5 py-3 text-stone-700 tabular-nums">{user._count.songs}</td>
                    <td className="px-5 py-3">
                      <PlanBadge plan={user.plan} status={user.stripeSubscriptionStatus} periodEnd={user.stripeCurrentPeriodEnd} cancelAt={user.stripeCancelAt} />
                    </td>
                    <td className="px-5 py-3 text-stone-500 text-xs hidden lg:table-cell">{fmtDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
