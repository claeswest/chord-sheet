"use client";

// One user, on one page: who they are, what they pay, what they have been
// sent, their songs, and what they have done. It used to be a row that opened
// inside the list, with the activity on another page behind a filter.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PlanBadge from "@/components/admin/PlanBadge";
import UserPanel, { lastActiveIso, type AdminUser } from "@/components/admin/UserPanel";
import {
  Avatar, BADGE, BTN_LINE, CARD, ErrorBox, LABEL, LINK, Loading, ROW, TONE, fmtDate, fmtDateTime, relativeTime,
} from "@/components/admin/ui";
import { badgeFor, metaSummary, type ActivityItem } from "@/components/admin/activityLabels";

interface Feed {
  items: ActivityItem[];
  total: number;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className={LABEL}>{label}</dt>
      <dd className="text-sm text-ink mt-1.5">{children}</dd>
    </div>
  );
}

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/users/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 404) throw new Error("There is no user with this id. They may have deleted their account.");
        if (!r.ok) throw new Error("Failed to load this user");
        return r.json();
      })
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message));
    // Their own account included: on this page "admins" must not be filtered out.
    fetch(`/api/admin/activity?userId=${encodeURIComponent(id)}&admins=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then(setFeed)
      .catch(() => setFeed({ items: [], total: 0 }));
  }, [id]);

  const seen = user ? lastActiveIso(user) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px]">
      <p className="mb-5 text-sm">
        <Link href="/admin/users" className={LINK}>← All users</Link>
      </p>

      {error && <ErrorBox>{error}</ErrorBox>}
      {!user && !error && <Loading />}

      {user && (
        <>
          <header className="flex flex-wrap items-center gap-x-5 gap-y-4 mb-6">
            <Avatar name={user.name ?? user.email ?? "?"} image={user.image} size={56} />
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-medium text-3xl tracking-[-0.02em] text-ink truncate">
                {user.name ?? user.email ?? "Unnamed user"}
              </h1>
              <p className="text-sm text-stone-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {user.email && <a href={`mailto:${user.email}`} className={LINK}>{user.email}</a>}
                <PlanBadge plan={user.plan} status={user.stripeSubscriptionStatus} periodEnd={user.stripeCurrentPeriodEnd} cancelAt={user.stripeCancelAt} />
                {user.marketingOptOut && <span className={`${BADGE} ${TONE.quiet}`}>opted out of emails</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.hasSubscribedBefore ? (
                <a href={`/api/admin/users/${encodeURIComponent(user.id)}/stripe`} target="_blank" rel="noopener" className={BTN_LINE}>
                  Open in Stripe ↗
                </a>
              ) : (
                <span className="text-xs text-stone-500 self-center">Never been through checkout</span>
              )}
            </div>
          </header>

          <dl className={`${CARD} grid grid-cols-2 sm:grid-cols-5 gap-5 p-5 mb-6`}>
            <Fact label="Joined">{fmtDate(user.createdAt)}</Fact>
            <Fact label="Last active">{seen ? relativeTime(seen) : "—"}</Fact>
            <Fact label="Songs">{user._count.songs}</Fact>
            <Fact label="Setlists">{user._count.categories}</Fact>
            <Fact label={user.stripeSubscriptionStatus === "trialing" ? "Trial converts" : user.stripeCancelAt && new Date(user.stripeCancelAt) > new Date() ? "Access ends" : "Renews"}>
              {user.stripeCancelAt && new Date(user.stripeCancelAt) > new Date()
                ? fmtDate(user.stripeCancelAt)
                : user.stripeCurrentPeriodEnd && new Date(user.stripeCurrentPeriodEnd) > new Date()
                ? fmtDate(user.stripeCurrentPeriodEnd)
                : "—"}
            </Fact>
          </dl>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 items-start">
            <section className={`${CARD} p-5 sm:p-6`}>
              <UserPanel user={user} />
            </section>

            <section className={`${CARD} p-5 sm:p-6`}>
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <h2 className="font-display font-medium text-xl tracking-[-0.01em] text-ink">Timeline</h2>
                {feed && feed.total > feed.items.length && (
                  <Link href={`/admin/activity?userId=${encodeURIComponent(user.id)}`} className={`text-xs ${LINK}`}>
                    All {feed.total} events →
                  </Link>
                )}
              </div>
              {!feed && <Loading />}
              {feed && feed.items.length === 0 && (
                <p className="text-sm text-stone-600">Nothing recorded for this account yet.</p>
              )}
              {feed && feed.items.length > 0 && (
                <ol>
                  {feed.items.map((item, i) => {
                    const t = badgeFor(item);
                    const count = typeof item.meta?.count === "number" ? item.meta.count : 1;
                    return (
                      <li key={item.id} className={`py-2.5 ${i ? ROW : ""}`}>
                        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className={`${BADGE} ${TONE[t.tone]}`}>{t.label}{count > 1 ? ` ×${count}` : ""}</span>
                          <span className="text-xs text-stone-500 ml-auto whitespace-nowrap" title={fmtDateTime(item.createdAt)}>
                            {relativeTime(item.createdAt)}
                          </span>
                        </p>
                        {metaSummary(item) && <p className="text-xs text-stone-600 mt-1">{metaSummary(item)}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
