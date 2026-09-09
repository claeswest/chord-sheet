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
import { EMPTY_GLOSSARY, codesIn, normalizeGlossary, withDefaultColors, type Glossary } from "@/lib/glossary";
import type { Lesson, Schedule } from "@/types/schedule";

const THEMES = [
  { id: "", name: "Papper", dot: "#3b5bdb" },
  // Thin lines, no fills, black on white. Most people printing this at home
  // have an office printer and no wish to spend a cartridge on a timetable.
  { id: "plain", name: "Bläcksnål", dot: "#ffffff" },
  { id: "dusk", name: "Skymning", dot: "#7c8cff" },
  { id: "meadow", name: "Äng", dot: "#2f7d46" },
  { id: "candy", name: "Godis", dot: "#d6336c" },
];

const STORE = "sm_state_v1";

/** Paper the sheet is laid out for. A3 is the same document, printed larger. */
const PAPERS = [
  { id: "a4-landscape", name: "A4 liggande", css: "A4 landscape", w: "297mm", h: "210mm" },
  { id: "a4-portrait", name: "A4 stående", css: "A4 portrait", w: "210mm", h: "297mm" },
  { id: "a3-landscape", name: "A3 liggande", css: "A3 landscape", w: "420mm", h: "297mm" },
  { id: "a3-portrait", name: "A3 stående", css: "A3 portrait", w: "297mm", h: "420mm" },
];

type Stored = { schedule: Schedule; glossary: Glossary; theme: string; paper?: string };

export default function Home() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [glossary, setGlossary] = useState<Glossary>(EMPTY_GLOSSARY);
  const [theme, setTheme] = useState("");
  const [paper, setPaper] = useState("a4-landscape");
  // The original photograph, for checking against while editing. Held in
  // memory only: it is a picture of a child's schedule, and writing it to
  // localStorage would leave it on the disk long after the tab is closed.
  const [source, setSource] = useState<string | null>(null);
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
          setGlossary(normalizeGlossary(s.glossary));
          setTheme(s.theme ?? "");
          setPaper(s.paper ?? "a4-landscape");
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
      if (schedule) localStorage.setItem(STORE, JSON.stringify({ schedule, glossary, theme, paper }));
      else localStorage.removeItem(STORE);
    } catch {
      /* a full or disabled store just means edits don't survive a reload */
    }
  }, [loaded, schedule, glossary, theme, paper]);

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
      // Colours up front, so the sheet arrives looking like something.
      setGlossary(withDefaultColors(EMPTY_GLOSSARY, codesIn(data.schedule).subjects));
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
      const small = await compressImage(dataUrl, 1600, 0.85);
      setSource(small);
      await read({ image: small });
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

  function addLesson(weekId: string, dayId: string) {
    if (!schedule) return;
    const lesson: Lesson = {
      id: Math.random().toString(36).slice(2, 10),
      start: "",
      end: "",
      subject: "Nytt pass",
    };
    setSchedule({
      ...schedule,
      weeks: schedule.weeks.map((w) =>
        w.id !== weekId
          ? w
          : {
              ...w,
              days: w.days.map((d) => (d.id !== dayId ? d : { ...d, lessons: [...d.lessons, lesson] })),
            },
      ),
    });
    // Straight into the editor: an empty card called "Nytt pass" is not what
    // anyone wanted, it is the first half of what they wanted.
    setOpenLesson({ weekId, dayId, lesson });
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

  const sheetPaper = PAPERS.find((p) => p.id === paper) ?? PAPERS[0];

  return (
    <main className="app" data-theme={theme || undefined}>
      {/* @page can't be set from a class, so the chosen size is injected.
          Without it the browser prints A4 whatever the sheet is laid out for,
          and an A3 schedule comes out cropped. */}
      <style>{`@page { size: ${sheetPaper.css}; margin: 0; }
        .sheet { width: ${sheetPaper.w}; min-height: ${sheetPaper.h}; }`}</style>
      {!schedule && (
        <div className="no-print">
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>Gör ett snyggare schema</h1>
          <p className="hint" style={{ marginTop: 0 }}>
            Fotografera schemat du fått hem. Bilden skickas till Google för att läsas av, och
            sparas inte hos oss — det färdiga schemat stannar i den här webbläsaren.
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
            <select
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              aria-label="Pappersformat"
            >
              {PAPERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSchedule(null);
                setSource(null);
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

          {editing && source && (
            <details className="panel no-print">
              <summary>
                <span className="panel-title">Originalet</span>
                <span className="hint"> — jämför utan att leta rätt på papperet</span>
              </summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt="Det fotograferade schemat" className="source-photo" />
            </details>
          )}

          <FitToWidth>
            <ScheduleSheet
              schedule={schedule}
              glossary={glossary}
              editable={editing}
              onChange={setSchedule}
              onEditLesson={(weekId, dayId, lesson) => setOpenLesson({ weekId, dayId, lesson })}
              onAddLesson={addLesson}
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
