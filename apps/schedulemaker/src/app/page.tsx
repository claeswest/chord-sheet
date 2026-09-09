"use client";

// The whole product, on one page: photograph a timetable, choose how it
// looks, print it.
//
// No account and no database. The schedule lives in this component's state and
// nowhere else — close the tab and it is gone. For a sheet carrying a child's
// name, class and school, not having it is the cheapest way to look after it.

import { useState } from "react";
import { compressImage } from "@clavos/core/image";
import ScheduleSheet from "@/components/ScheduleSheet";
import FitToWidth from "@/components/FitToWidth";
import type { Schedule } from "@/types/schedule";

const THEMES = [
  { id: "", name: "Papper", dot: "#3b5bdb" },
  { id: "dusk", name: "Skymning", dot: "#7c8cff" },
  { id: "meadow", name: "Äng", dot: "#2f7d46" },
  { id: "candy", name: "Godis", dot: "#d6336c" },
];

export default function Home() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");

  async function read(payload: { image?: string; text?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Något gick fel. Försök igen.");
        return;
      }
      setSchedule(data.schedule);
    } catch {
      setError("Kunde inte nå servern.");
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(file: File) {
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      // A phone photo is several megabytes of detail the model can't use.
      // 1600px keeps a room number legible and stays inside the body limit.
      await read({ image: await compressImage(dataUrl, 1600, 0.85) });
    } catch {
      setError("Kunde inte läsa filen.");
    }
  }

  return (
    <main className="app" data-theme={theme || undefined}>
      {!schedule && (
        <div className="no-print">
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>Gör ett snyggare schema</h1>
          <p className="hint" style={{ marginTop: 0 }}>
            Fotografera schemat du fått hem. Ingenting sparas — det lever i den här fliken tills
            du skriver ut det.
          </p>

          <div className="controls" style={{ marginTop: 24 }}>
            <label className="btn" style={{ cursor: "pointer" }}>
              Välj foto
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickPhoto(f);
                  e.target.value = ""; // so the same file can be picked twice
                }}
              />
            </label>
            {busy && <span className="hint">Läser schemat…</span>}
          </div>

          <details style={{ marginTop: 20 }}>
            <summary className="hint" style={{ cursor: "pointer" }}>
              …eller klistra in det som text
            </summary>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Måndag\n08:20–09:00 Matematik, sal 12\n09:10–10:00 Idrott"}
              style={{ marginTop: 10 }}
            />
            <div className="controls" style={{ marginTop: 10 }}>
              <button
                className="primary"
                disabled={busy || text.trim().length < 20}
                onClick={() => read({ text })}
              >
                Läs schemat
              </button>
            </div>
          </details>

          {error && <p className="error">{error}</p>}
        </div>
      )}

      {schedule && (
        <>
          <div className="controls no-print">
            <button onClick={() => window.print()} className="primary">
              Skriv ut
            </button>
            {THEMES.map((t) => (
              <button
                key={t.id}
                className="swatch"
                style={{ background: t.dot }}
                aria-label={t.name}
                aria-pressed={theme === t.id}
                onClick={() => setTheme(t.id)}
              />
            ))}
            <button onClick={() => { setSchedule(null); setText(""); }}>Börja om</button>
            <span className="hint">Kontrollera mot originalet innan du skriver ut.</span>
          </div>
          {error && <p className="error no-print">{error}</p>}
          <FitToWidth>
            <ScheduleSheet schedule={schedule} />
          </FitToWidth>
        </>
      )}
    </main>
  );
}
