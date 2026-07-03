// Lightweight funnel analytics helper.
//
// Sends custom events to Google Analytics 4 (gtag) so we can see exactly where
// visitors drop off in the create-a-chord-sheet funnel:
//
//   cta_try_free → editor_opened → start_choice → ai_search → import_success
//   → first_chord_placed → song_saved
//
// All calls are safe no-ops if gtag isn't loaded (e.g. NEXT_PUBLIC_GA_ID unset,
// ad-blockers, or server-side rendering).

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fire a GA4 event. Silently does nothing if gtag is unavailable. */
export function track(event: string, params: GtagParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
  } catch {
    /* never let analytics break the app */
  }
}

// ── Funnel step helpers (named so call sites stay self-documenting) ──────────

/** Visitor clicked a "Try it free" call-to-action. `from` = page/source. */
export const trackCtaTryFree = (from: string) => track("cta_try_free", { from });

/** The new-song editor opened (start modal shown). */
export const trackEditorOpened = (loggedIn: boolean) =>
  track("editor_opened", { logged_in: loggedIn });

/** User picked how to start: search | import | template | scratch | demo. */
export const trackStartChoice = (method: string) =>
  track("start_choice", { method });

/** AI song search finished. result = success | notfound | error. */
export const trackAiSearch = (result: "success" | "notfound" | "error") =>
  track("ai_search", { result });

/** Content was imported into the editor. source = search | text | photo. */
export const trackImportSuccess = (source: string) =>
  track("import_success", { source });

/** The user placed their first chord on a brand-new song (the "aha"). */
export const trackFirstChord = () => track("first_chord_placed");

/** A song was saved. auth = guest | user. */
export const trackSongSaved = (auth: "guest" | "user") =>
  track("song_saved", { auth });

// ── Activation funnel (treat "playable chart reached" as activation) ─────────

/** A visitor opened the pre-loaded demo chart (demo-first entry). */
export const trackDemoStarted = () => track("demo_started");

/** The user made their first real edit to the chart (chord/text/transpose). */
export const trackFirstEdit = () => track("first_edit_made");

/** The user started hands-free performance / auto-scroll — the core payoff. */
export const trackStageModeStarted = () => track("stage_mode_started");

/** The paywall/upgrade prompt was shown after the user had created value. */
export const trackPaywallSeen = (where: string) =>
  track("paywall_seen_after_value", { where });

/** The user initiated a paid checkout / free trial. plan = monthly | yearly. */
export const trackTrialStarted = (plan: string) =>
  track("trial_started", { plan });

/** The "don't lose your work" signup nudge was shown to / clicked by a guest. */
export const trackSignupNudge = (action: "shown" | "clicked") =>
  track("signup_nudge", { action });

/** A new account was created (fired once, client-side, on the first visit
 *  after registration). GA4-recommended event name — mark as key event so
 *  Traffic acquisition can attribute signups to channel/campaign. */
export const trackSignUp = () => track("sign_up");
