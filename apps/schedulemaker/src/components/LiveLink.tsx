"use client";

// The second way to share, in the share dialog: a link that always shows the
// latest saved version. See lib/linkDb.ts for what it is.
//
// It has four states, and says which one it is in rather than showing a button
// that does not work:
//
// - link on: the address, and the way to turn it off. This comes first and
//   does not ask about the plan: someone who made a link and is no longer on
//   Plus must still be able to see that it exists and close it.
// - not on Plus: what it is, and where to read about Plus
// - on Plus, schedule not saved: save first — there is nothing for a link to
//   point at until then
// - saved, no link: make one
//
// Two things are said plainly because getting them wrong would hurt. The link
// shows the schedule as it is *saved*, heading and all — unlike the copy
// above, which leaves the child's name out. And it shows the saved version,
// so changes made here are invisible to everyone else until Spara is pressed.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { copyText } from "@/lib/clipboard";

export default function LiveLink({
  plan,
  signedIn,
  savedId,
  unsaved,
  saving,
  onSave,
}: {
  plan: "free" | "plus" | undefined;
  signedIn: boolean;
  /** The saved schedule the one on screen is, if it has been saved. */
  savedId: string | undefined;
  /** Changes here that have not been saved, and so are not in the link. */
  unsaved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<null | "yes" | "by-hand">(null);
  /** "Stäng av länken" is armed before it fires: it breaks the link for everyone holding it. */
  const [closing, setClosing] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  const onPlus = signedIn && plan === "plus";

  useEffect(() => {
    // Asked for every signed-in owner of a saved schedule, Plus or not — see
    // the first state above.
    if (!signedIn || !savedId) {
      setToken(null);
      return;
    }
    let live = true;
    setLoading(true);
    fetch(`/api/schedules/${savedId}/link`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => live && setToken(typeof d.token === "string" ? d.token : null))
      .catch(() => live && setError("Det gick inte att se om schemat har en länk. Stäng och öppna rutan igen."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [signedIn, savedId]);

  const url = token ? `${window.location.origin}/s/${token}` : null;

  async function turnOn() {
    if (!savedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/${savedId}/link`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "");
      setToken(data.token);
    } catch (e) {
      setError((e instanceof Error && e.message) || "Det gick inte att skapa länken. Försök igen.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!savedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/${savedId}/link`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setToken(null);
      setCopied(null);
    } catch {
      setError("Det gick inte att stänga av länken. Försök igen.");
    } finally {
      setBusy(false);
      setClosing(false);
    }
  }

  async function copy() {
    if (!url) return;
    setCopied((await copyText(url, field.current)) ? "yes" : "by-hand");
  }

  return (
    <section className="live-link" aria-labelledby="live-link-title">
      <p className="panel-title" id="live-link-title">
        En länk som alltid är aktuell <span className="plus-tag now">Plus</span>
      </p>

      {loading ? (
        <p className="hint">Ser efter om schemat har en länk…</p>
      ) : !url && !onPlus ? (
        <>
          <p className="share-lead">
            Ändrar du schemat ser alla som har länken det nya, utan att du skickar något igen. Det
            ingår i Plus.
          </p>
          <Link href="/plus" className="btn">
            Läs om Plus →
          </Link>
        </>
      ) : !savedId ? (
        <>
          <p className="share-lead">
            Spara schemat först. Länken visar det som är sparat, så det måste finnas något att visa.
          </p>
          <button onClick={onSave} disabled={saving}>
            {saving ? "Sparar…" : "Spara schemat"}
          </button>
        </>
      ) : url ? (
        <>
          <p className="share-lead">
            Alla som har länken ser schemat som det är sparat, med rubriken. De behöver inget konto.
          </p>
          <input
            ref={field}
            className="share-link"
            readOnly
            value={url}
            aria-label="Länk som alltid visar senaste versionen"
            onFocus={(e) => e.target.select()}
          />
          {copied === "by-hand" && (
            <p className="error" role="status" style={{ margin: "8px 0 0" }}>
              Webbläsaren lät oss inte kopiera. Länken är markerad – kopiera den själv.
            </p>
          )}
          {unsaved && (
            <p className="live-warning" role="status">
              Du har ändringar som inte är sparade. Länken visar den sparade versionen tills du
              sparar.{" "}
              <button className="linky" style={{ marginTop: 0 }} onClick={onSave} disabled={saving}>
                {saving ? "Sparar…" : "Spara nu"}
              </button>
            </p>
          )}
          <div className="controls" style={{ marginTop: 12, marginBottom: 0 }}>
            <button className="primary" onClick={copy}>
              {copied === "yes" ? "Kopierad!" : "Kopiera länken"}
            </button>
            {closing ? (
              <span className="confirm">
                Länken slutar fungera för alla som har den.
                <button className="danger" onClick={turnOff} disabled={busy}>
                  Ja, stäng av
                </button>
                <button className="quiet" onClick={() => setClosing(false)}>
                  Avbryt
                </button>
              </span>
            ) : (
              <button className="quiet" onClick={() => setClosing(true)}>
                Stäng av länken
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="share-lead">
            Alla som har länken ser schemat som det är sparat, med rubriken. Ändrar du och sparar
            ser de det nya – ingen behöver få en ny länk. Du kan stänga av den när du vill.
          </p>
          <button className="primary" onClick={turnOn} disabled={busy}>
            {busy ? "Skapar…" : "Skapa länken"}
          </button>
        </>
      )}

      {error && (
        <p className="error" role="alert" style={{ margin: "10px 0 0" }}>
          {error}
        </p>
      )}
    </section>
  );
}
