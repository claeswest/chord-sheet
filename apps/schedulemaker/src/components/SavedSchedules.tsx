"use client";

// The list on "Mina scheman": open, copy, delete — and delete everything.
//
// Opening a saved schedule puts it where the editor keeps the one being worked
// on (this browser's localStorage) and goes there. The editor has room for one
// schedule, so if there is unsaved work in it, opening asks first: the saved
// one can always be fetched again, the unsaved one cannot.
//
// Both kinds of delete are armed before they fire, like "Börja om" in the
// editor. Neither can be undone, and the buttons sit next to "Öppna".

import { useEffect, useState } from "react";
import Link from "next/link";
import { SHEET_STORE, type StoredSheet } from "@/lib/sheetState";

type Item = { id: string; title: string; detail: string | null; updatedAt: string };

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

/** The schedule in the editor right now, if there is one. */
function localSheet(): StoredSheet | null {
  try {
    const raw = localStorage.getItem(SHEET_STORE);
    const s = raw ? (JSON.parse(raw) as StoredSheet) : null;
    return s?.schedule ? s : null;
  } catch {
    return null;
  }
}

export default function SavedSchedules() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  /** The id whose delete is armed, or "account" for the whole account. */
  const [armed, setArmed] = useState<string | null>(null);
  /** The id waiting for "yes, replace what is in the editor". */
  const [replacing, setReplacing] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/schedules");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setItems(data.schedules ?? []);
    } catch {
      setError("Vi når inte dina scheman just nu. Kolla uppkopplingen och ladda om sidan.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function open(id: string, confirmed = false) {
    const local = localSheet();
    // Unsaved work in the editor that is not this schedule: ask before it goes.
    if (!confirmed && local && !local.savedId) {
      setReplacing(id);
      return;
    }
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "");
      const stored: StoredSheet = { ...data.schedule.state, savedId: id };
      localStorage.setItem(SHEET_STORE, JSON.stringify(stored));
      window.location.href = "/";
    } catch (e) {
      setError((e instanceof Error && e.message) || "Det gick inte att öppna schemat. Försök igen.");
      setBusy(null);
    }
  }

  async function copy(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/${id}/copy`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "");
      await load();
    } catch (e) {
      setError((e instanceof Error && e.message) || "Det gick inte att kopiera schemat. Försök igen.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error();
      // The editor may still be showing it. It stays there — it is that
      // browser's copy — but it is no longer "the saved one".
      const local = localSheet();
      if (local?.savedId === id) {
        localStorage.setItem(SHEET_STORE, JSON.stringify({ ...local, savedId: undefined }));
      }
      setItems((list) => (list ?? []).filter((i) => i.id !== id));
    } catch {
      setError("Det gick inte att ta bort schemat. Försök igen.");
    } finally {
      setBusy(null);
      setArmed(null);
    }
  }

  async function removeAccount() {
    setBusy("account");
    setError(null);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) throw new Error();
      const local = localSheet();
      if (local?.savedId) {
        localStorage.setItem(SHEET_STORE, JSON.stringify({ ...local, savedId: undefined }));
      }
      window.location.href = "/";
    } catch {
      setError("Det gick inte att ta bort kontot. Försök igen.");
      setBusy(null);
      setArmed(null);
    }
  }

  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {items === null && !error && <p className="hint">Hämtar dina scheman…</p>}

      {items !== null && items.length === 0 && (
        <p className="saved-empty">
          Du har inga sparade scheman än. Gör ett schema och tryck på <strong>Spara</strong>, så
          hamnar det här. <Link href="/">Till schemat</Link>
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="saved-list">
          {items.map((item) => (
            <li key={item.id} className="saved-item">
              <div className="saved-text">
                <p className="saved-title">{item.title}</p>
                <p className="hint">
                  {item.detail ? `${item.detail} · ` : ""}
                  ändrat {dateOf(item.updatedAt)}
                </p>
              </div>

              {replacing === item.id ? (
                <span className="confirm">
                  Schemat du har öppet är inte sparat och försvinner.
                  <button className="danger" onClick={() => open(item.id, true)}>
                    Öppna ändå
                  </button>
                  <button className="quiet" onClick={() => setReplacing(null)}>
                    Avbryt
                  </button>
                </span>
              ) : armed === item.id ? (
                <span className="confirm">
                  Ta bort för gott?
                  <button className="danger" onClick={() => remove(item.id)} disabled={busy === item.id}>
                    Ja, ta bort
                  </button>
                  <button className="quiet" onClick={() => setArmed(null)}>
                    Avbryt
                  </button>
                </span>
              ) : (
                <div className="saved-actions">
                  <button className="primary" onClick={() => open(item.id)} disabled={busy !== null}>
                    Öppna
                  </button>
                  <button onClick={() => copy(item.id)} disabled={busy !== null}>
                    Kopiera
                  </button>
                  <button className="quiet" onClick={() => setArmed(item.id)} disabled={busy !== null}>
                    Ta bort
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="saved-back">
        <Link href="/">← Till schemat</Link>
      </p>

      <section className="saved-account">
        <h2>Ta bort kontot</h2>
        <p className="hint">
          Tar bort kontot och alla scheman du har sparat här. Det går inte att ångra. Ett schema som
          ligger öppet i den här webbläsaren finns kvar där.
        </p>
        {armed === "account" ? (
          <span className="confirm">
            Ta bort kontot och alla sparade scheman?
            <button className="danger" onClick={removeAccount} disabled={busy === "account"}>
              Ja, ta bort allt
            </button>
            <button className="quiet" onClick={() => setArmed(null)}>
              Avbryt
            </button>
          </span>
        ) : (
          <button className="danger" onClick={() => setArmed("account")}>
            Ta bort mitt konto
          </button>
        )}
      </section>
    </>
  );
}
