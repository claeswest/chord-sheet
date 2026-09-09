"use client";

// The whole product, on one page: photograph a timetable, make it yours,
// print it.
//
// Still no account and no server-side storage. The schedule is kept in this
// browser's localStorage so a reload doesn't throw away an afternoon of
// naming teachers — it stays on this device, and never reaches us. For a sheet
// carrying a child's name, class, school and daily movements, the cheapest way
// to look after it is not to have it.

import { useEffect, useState } from "react";
import { compressImage } from "@clavos/core/image";
import ScheduleSheet from "@/components/ScheduleSheet";
import FitToWidth from "@/components/FitToWidth";
import GlossaryPanel from "@/components/GlossaryPanel";
import LessonEditor from "@/components/LessonEditor";
import { EMPTY_GLOSSARY, type Glossary } from "@/lib/glossary";
import type { Lesson, Schedule } from "@/types/schedule";

const THEMES = [
  { id: "", name: "Papper", dot: "#3b5bdb" },
  { id: "dusk", name: "Skymning", dot: "#7c8cff" },
  { id: "meadow", name: "Äng", dot: "#2f7d46" },
  { id: "candy", name: "Godis", dot: "#d6336c" },
];

const STORE = "sm_state_v1";

type Stored = { schedule: Schedule; glossary: Glossary; theme: string };

export default function Home() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [glossary, setGlossary] = useState<Glossary>(EMPTY_GLOSSARY);
  const [theme, setTheme] = useState("");
  const [editing, setEditing] = useState(true);
  const [openLesson, setOpenLesson] = useState<{ weekId: string; dayId: string; lesson: Lesson } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  // Nothing is written back until the first read completes, so a failed load
  // can't wipe what's already there.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const s = JSON.parse(raw) as Stored;
        if (s.schedule) {
          setSchedule(s.schedule);
          setGlossary(s.glossary ?? EMPTY_GLOSSARY);
          setTheme(s.theme ?? "");
        }
      }
    } catch {
      /* private mode, or a shape from an older version — start fresh */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (schedule) localStorage.setItem(STORE, JSON.stringify({ schedule, glossary, theme }));
      else localStorage.removeItem(STORE);
    } catch {
      /* a full or disabled store just means edits don't survive a reload */
    }
  }, [loaded, schedule, glossary, theme]);

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
      setGlossary(EMPTY_GLOSSARY);
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

  function saveLesson(next: Lesson) {
    if (!schedule || !openLesson) return;
    const { weekId, dayId } = openLesson;
    setSchedule({
      ...schedule,
      weeks: schedule.weeks.map((w) =>
        w.id !== weekId
          ? w
          : {
              ...w,
              days: w.days.map((d) =>
                d.id !== dayId
                  ? d
                  : { ...d, lessons: d.lessons.map((l) => (l.id === next.id ? next : l)) },
              ),
            },
      ),
    });
    setOpenLesson(null);
  }

  function deleteLesson() {
    if (!schedule || !openLesson) return;
    const { weekId, dayId, lesson } = openLesson;
    setSchedule({
      ...schedule,
      weeks: schedule.weeks.map((w) =>
        w.id !== weekId
          ? w
          : {
              ...w,
              days: w.days.map((d) =>
                d.id !== dayId ? d : { ...d, lessons: d.lessons.filter((l) => l.id !== lesson.id) },
              ),
            },
      ),
    });
    setOpenLesson(null);
  }

  return (
    <main className="app" data-theme={theme || undefined}>
      {!schedule && (
        <div className="no-print">
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>Gör ett snyggare schema</h1>
          <p className="hint" style={{ marginTop: 0 }}>
            Fotografera schemat du fått hem. Det stannar i den här webbläsaren — ingenting skickas
            vidare och ingenting sparas hos oss.
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
              <button className="primary" disabled={busy || text.trim().length < 20} onClick={() => read({ text })}>
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
            <button onClick={() => window.print()} className="primary">Skriv ut</button>
            <button onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
              {editing ? "Klar med ändringar" : "Ändra"}
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
            <button
              onClick={() => {
                setSchedule(null);
                setGlossary(EMPTY_GLOSSARY);
                setText("");
              }}
            >
              Börja om
            </button>
          </div>

          <p className="hint no-print" style={{ marginTop: -8 }}>
            {editing
              ? "Klicka på titeln, en dag eller ett pass för att ändra det. Kontrollera mot originalet innan du skriver ut."
              : "Kontrollera mot originalet innan du skriver ut."}
          </p>

          {error && <p className="error no-print">{error}</p>}

          {editing && (
            <GlossaryPanel schedule={schedule} glossary={glossary} onChange={setGlossary} />
          )}

          <FitToWidth>
            <ScheduleSheet
              schedule={schedule}
              glossary={glossary}
              editable={editing}
              onChange={setSchedule}
              onEditLesson={(weekId, dayId, lesson) => setOpenLesson({ weekId, dayId, lesson })}
            />
          </FitToWidth>

          {openLesson && (
            <LessonEditor
              lesson={openLesson.lesson}
              onSave={saveLesson}
              onDelete={deleteLesson}
              onClose={() => setOpenLesson(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
