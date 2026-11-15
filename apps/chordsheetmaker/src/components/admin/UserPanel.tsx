"use client";

// Everything the admin can see and do about one user below their name: the
// email sequence and its send control, their setlists, their songs. Used
// inside an opened row on the users list and on the user's own page, so the
// two can't drift apart.

import { useEffect, useState } from "react";
import SongPreviewModal from "@/components/admin/SongPreviewModal";
import {
  AUTO_DRIP_MAX_ACCOUNT_AGE_DAYS,
  AUTO_DRIP_TEMPLATES,
  EMAIL_COOLDOWN_DAYS,
  EMAIL_SEQUENCE,
  allowedTemplates,
  isLeaving,
  nextAutoTemplate,
  suggestNextTemplate,
  templateBlockReason,
  type Audience,
  type MarketingTemplate,
} from "@/lib/marketingRules";
import { BTN, INPUT, LABEL, TONE, fmtDate } from "./ui";

export interface AdminSong {
  id: string;
  title: string;
  artist: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  plan: string | null;
  stripeSubscriptionStatus: string | null;
  stripeCurrentPeriodEnd: string | null;
  stripeCancelAt: string | null;
  hasSubscribedBefore: boolean;
  marketingOptOut: boolean;
  lastMarketingEmailAt: string | null;
  createdAt: string;
  _count: { songs: number; categories: number };
  songs: (AdminSong & { updatedAt: string })[];
  categories: { id: string; name: string; parentId: string | null }[];
  sessions: { expires: string }[];
}

// NextAuth database sessions live 30 days and roll forward on activity, so
// the newest session's expiry minus 30 days ≈ when the user was last active.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export function lastActiveIso(user: AdminUser): string | null {
  const exp = user.sessions?.[0]?.expires;
  if (!exp) return null;
  return new Date(new Date(exp).getTime() - SESSION_MAX_AGE_MS).toISOString();
}

interface EmailHistoryItem {
  id: string;
  sentAt: string;
  template: string;
  /** Sent by the daily job rather than from this page. */
  auto?: boolean;
}

// Labels for the marketing-email templates (mirror MARKETING_TEMPLATES)
const EMAIL_TEMPLATES: [string, string][] = [
  ["welcome_tips", "Welcome tips"],
  ["ai_magic", "AI magic"],
  ["photo_rescue", "Photo rescue"],
  ["band_share", "Band sharing"],
  ["upgrade_nudge", "Upgrade nudge"],
  ["feedback_ask", "Feedback ask"],
  ["winback", "Win-back"],
];
const TEMPLATE_LABELS = Object.fromEntries(EMAIL_TEMPLATES);

/** Everything the send rules need to know about one user. */
function audienceOf(user: AdminUser): Audience {
  return {
    plan: user.plan,
    cancelAt: user.stripeCancelAt,
    hasSubscribedBefore: user.hasSubscribedBefore,
  };
}

export default function UserPanel({ user }: { user: AdminUser }) {
  const [songs, setSongs] = useState<AdminSong[] | null>(null);
  const [history, setHistory] = useState<EmailHistoryItem[] | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);

  function loadHistory() {
    fetch(`/api/admin/users/${user.id}/emails`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => setHistory(d.emails))
      .catch(() => {});
  }

  // The list sends only each user's five latest songs, to stay light; the
  // rest, and the email history, are fetched when the panel is opened.
  useEffect(() => {
    fetch(`/api/admin/users/${user.id}/songs`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => setSongs(d.songs))
      .catch(() => {});
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function sendEmail(which: string) {
    setStatus("sending");
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [user.id], template: which }),
      });
      const d = await res.json();
      const result = d.results?.[user.id] ?? "failed";
      setStatus(result);
      if (result === "sent") loadHistory(); // reflect the new send
    } catch {
      setStatus("failed");
    }
  }

  const sent = history ?? [];
  const sentByTemplate = new Map<string, string>(); // template → latest sentAt
  sent.forEach((e) => { if (!sentByTemplate.has(e.template)) sentByTemplate.set(e.template, e.sentAt); });
  const sentByJob = new Set(sent.filter((e) => e.auto).map((e) => e.template));
  const audience = audienceOf(user);
  // What the daily job will send this person next, if anything. Same rules as
  // the job itself (lib/autoDrip.ts) — the age limit included. Nothing is
  // claimed until the history has arrived: with an empty one, everybody looks
  // like they are owed the welcome.
  const historyLoaded = history !== null;
  const tooOld = (Date.now() - new Date(user.createdAt).getTime()) / 86400000 > AUTO_DRIP_MAX_ACCOUNT_AGE_DAYS;
  const autoNext =
    !historyLoaded || user.marketingOptOut || tooOld
      ? null
      : nextAutoTemplate(new Set(sent.map((e) => e.template)), audience);
  const allowed = new Set(allowedTemplates(audience));
  const suggested = suggestNextTemplate(new Set(sentByTemplate.keys()), audience);
  const selected = template ?? suggested;
  const last = user.lastMarketingEmailAt ? new Date(user.lastMarketingEmailAt).getTime() : null;
  const cooldownUntil = last ? last + EMAIL_COOLDOWN_DAYS * 86400000 : null;
  const coolingDown = cooldownUntil !== null && cooldownUntil > Date.now();
  const trackerSteps = [...EMAIL_SEQUENCE, "winback" as MarketingTemplate].filter((t) => allowed.has(t));

  const shownSongs = songs ?? user.songs;

  return (
    <div>
      {/* Marketing emails — where they are in the sequence, and sending the next */}
      <div className="mb-6">
        <p className={`${LABEL} mb-2`}>Email sequence</p>
        {/* What the daily job is going to do, so nobody sends by hand what is
            about to send itself. Silent for opt-outs — the line below already
            says why nothing goes out. */}
        {historyLoaded && !user.marketingOptOut && (
          <p className="text-xs text-stone-600 mb-2">
            {autoNext
              ? <><span className="font-semibold text-ink">{TEMPLATE_LABELS[autoNext] ?? autoNext}</span> goes out by itself at the next daily run{coolingDown ? " after the cooldown" : ""}. You get a copy.</>
              : isLeaving(audience)
              ? <>Nothing is sent automatically to someone who is cancelling.</>
              : tooOld
              ? <>The account is older than {AUTO_DRIP_MAX_ACCOUNT_AGE_DAYS} days, so nothing is sent automatically. Sending is up to you.</>
              : <>The automatic part ({AUTO_DRIP_TEMPLATES.length} emails) is done. The rest are up to you.</>}
          </p>
        )}
        {isLeaving(audience) && (
          <p className="text-xs text-amber-800 mb-2">
            Cancelling: asking why beats pitching. Templates that assume they&apos;re staying, or that
            they still have a trial to spend, are hidden.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {trackerSteps.map((t) => {
            const sentAt = sentByTemplate.get(t);
            const isNext = !user.marketingOptOut && t === suggested;
            return (
              <span
                key={t}
                className={`text-[11px] px-2 py-1 rounded-md ${
                  sentAt ? TONE.good : isNext ? "bg-white border border-ink text-ink font-semibold" : "bg-paper border border-rule text-stone-500"
                }`}
                title={sentAt ? `Sent ${fmtDate(sentAt)}${sentByJob.has(t) ? ", automatically" : ""}` : t === autoNext ? "Next, sent automatically" : isNext ? "Suggested next" : "Not sent yet"}
              >
                {sentAt ? "✓ " : ""}{TEMPLATE_LABELS[t] ?? t}
                {sentAt && <span className="opacity-70"> · {fmtDate(sentAt)}{sentByJob.has(t) ? " · auto" : ""}</span>}
                {isNext && !sentAt && <span className="font-normal text-stone-500"> · {t === autoNext ? "next, auto" : "next"}</span>}
              </span>
            );
          })}
        </div>

        {user.marketingOptOut ? (
          <p className="text-xs text-stone-600">Opted out of marketing emails. Nothing can be sent.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select value={selected} onChange={(e) => setTemplate(e.target.value)} className={`${INPUT} !py-1.5 !text-xs`}>
              {EMAIL_TEMPLATES.map(([key, label]) => {
                const blocked = templateBlockReason(key as MarketingTemplate, audience);
                return (
                  <option key={key} value={key} disabled={!!blocked}>
                    {label}
                    {blocked ? `  — ${blocked}` : key === suggested ? "  (next)" : sentByTemplate.has(key) ? "  ✓ sent" : ""}
                  </option>
                );
              })}
            </select>
            <button onClick={() => sendEmail(selected)} disabled={status === "sending" || coolingDown} className={`${BTN} !px-3 !py-1.5 !text-xs`}>
              Send email
            </button>
            {coolingDown && (
              <span className="text-xs text-amber-800">
                Cooldown: can send again {fmtDate(new Date(cooldownUntil!).toISOString())}
              </span>
            )}
            {status === "sending" && <span className="text-xs text-stone-500">Sending…</span>}
            {status === "sent" && <span className="text-xs text-emerald-700">Sent ✓</span>}
            {status === "skipped_recent" && <span className="text-xs text-amber-800">Skipped: emailed within {EMAIL_COOLDOWN_DAYS} days</span>}
            {status === "skipped_optout" && <span className="text-xs text-stone-600">Skipped: opted out</span>}
            {status === "skipped_ineligible" && <span className="text-xs text-amber-800">Skipped: not appropriate for this user</span>}
            {status === "failed" && <span className="text-xs text-red-700">Failed</span>}
          </div>
        )}
      </div>

      {/* Setlists */}
      <p className={`${LABEL} mb-2`}>Setlists ({user._count.categories})</p>
      {user.categories.length === 0 ? (
        <p className="text-sm text-stone-500 mb-6">None</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {user.categories.map((cat) => (
            <span
              key={cat.id}
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-rule ${cat.parentId ? "bg-paper text-stone-500 ml-2" : "bg-paper-deep text-stone-700"}`}
              title={cat.parentId ? "A list inside another" : "Setlist"}
            >
              {cat.parentId && <span className="text-stone-400">└</span>}
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Songs */}
      <p className={`${LABEL} mb-3`}>
        Songs ({user._count.songs})
        {!songs && user._count.songs > 0 && <span className="ml-2 normal-case tracking-normal text-stone-400">loading…</span>}
      </p>
      {shownSongs.length === 0 ? (
        <p className="text-sm text-stone-500">No songs yet</p>
      ) : (
        <div className="border border-rule rounded-lg overflow-hidden bg-white">
          {shownSongs.map((song, i) => (
            <button
              key={song.id}
              onClick={() => setPreviewSongId(song.id)}
              className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-paper transition-colors group ${i ? "border-t border-rule" : ""}`}
            >
              <div className="min-w-0">
                {song.title?.trim() ? (
                  <p className="text-sm font-medium text-ink truncate group-hover:underline underline-offset-4">{song.title}</p>
                ) : (
                  <p className="text-sm font-medium italic text-stone-500 truncate">Untitled song</p>
                )}
                {song.artist && <p className="text-xs text-stone-500 truncate">{song.artist}</p>}
              </div>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-stone-500">{fmtDate(song.createdAt)}</span>
                <span className="text-xs text-chord opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {!songs && user._count.songs > user.songs.length && (
        <p className="text-xs text-stone-500 mt-2">+ {user._count.songs - user.songs.length} more…</p>
      )}

      {previewSongId && <SongPreviewModal songId={previewSongId} onClose={() => setPreviewSongId(null)} />}
    </div>
  );
}
