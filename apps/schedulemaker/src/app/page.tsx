"use client";

// The whole product, on one page: photograph a timetable, make it yours,
// print it.
//
// Still no account and no server-side storage. The schedule is kept in this
// browser's localStorage so a reload doesn't throw away an afternoon of
// naming teachers — it stays on this device, and never reaches us. For a sheet
// carrying a child's name, class, school and daily movements, the cheapest way
// to look after it is not to have it.

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@clavos/core/image";
import ScheduleSheet from "@/components/ScheduleSheet";
import FitToWidth from "@/components/FitToWidth";
import GlossaryPanel from "@/components/GlossaryPanel";
import LessonEditor from "@/components/LessonEditor";
import PrintFit from "@/components/PrintFit";
import Landing from "@/components/Landing";
import {
  EMPTY_GLOSSARY,
  codesIn,
  normalizeGlossary,
  withDefaultColors,
  withKnownNames,
  type Glossary,
} from "@/lib/glossary";
import { unresolvedChoices, type Lesson, type Schedule } from "@/types/schedule";

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
  // Two steps, not a toggle. Editing is where the schedule is made true —
  // names, corrections, and above all which of the five languages this child
  // actually reads. The finished sheet is where it is looked at and printed.
  // A printed timetable offering five languages in one box is simply wrong,
  // so the step across asks for those decisions first.
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const editing = mode === "edit";
  const [openLesson, setOpenLesson] = useState<{ weekId: string; dayId: string; lesson: Lesson } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Nothing is written back until the first read completes, so a failed load
  // can't wipe what's already there.
  const [loaded, setLoaded] = useState(false);
  // How much the sheet has to shrink to fit one page. 1 means it already does.
  const [fit, setFit] = useState(1);
  // Which slot a "behåll alla" / "ändra val" click was about, since those
  // carry no lesson to identify it by.
  const pendingSlotStart = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const s = JSON.parse(raw) as Stored;
        if (s.schedule) {
          setSchedule(s.schedule);
          // Tops up any subject without a colour or a known name — one added
          // by hand since, or one an older version of this app left blank.
          // Neither overwrites anything already decided.
          const subjects = codesIn(s.schedule).subjects;
          setGlossary(
            withDefaultColors(withKnownNames(normalizeGlossary(s.glossary), subjects), subjects),
          );
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
      // Colours and the names we're sure of up front, so the sheet arrives
      // looking like something and already half in words.
      const read = codesIn(data.schedule).subjects;
      setGlossary(withDefaultColors(withKnownNames(EMPTY_GLOSSARY, read), read));
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

  /**
   * Keep one option in a choice slot and set the others aside.
   *
   * A slot is the run of lessons sharing a start time. Passing null puts them
   * all back — the paper offered five languages and that record stays, so
   * changing your mind next term isn't another photograph.
   */
  function pickOption(weekId: string, dayId: string, lessonId: string | null, slotStart?: string) {
    if (!schedule) return;
    pendingSlotStart.current = slotStart ?? null;
    setSchedule({
      ...schedule,
      weeks: schedule.weeks.map((w) =>
        w.id !== weekId
          ? w
          : {
              ...w,
              days: w.days.map((d) => {
                if (d.id !== dayId) return d;
                const chosen = lessonId ? d.lessons.find((l) => l.id === lessonId) : null;
                // Without a chosen lesson we still need to know which slot was
                // asked about, so the caller's slot is identified by the click
                // target's start time, carried in openSlotStart.
                const slotStart = chosen?.start ?? pendingSlotStart.current;
                return {
                  ...d,
                  lessons: d.lessons.map((l) => {
                    const sameSlot = slotStart !== null && l.start === slotStart && l.start !== "";
                    if (!sameSlot) return l;
                    // Decided either way: one kept, or all kept on purpose.
                    return { ...l, resolved: true, hidden: chosen ? l.id !== chosen.id : false };
                  }),
                };
              }),
            },
      ),
    });
  }

  /** Put a decided slot back to being a question. */
  function reopenChoice(weekId: string, dayId: string, slotStart: string) {
    if (!schedule) return;
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
                  : {
                      ...d,
                      lessons: d.lessons.map((l) =>
                        l.start === slotStart && l.start !== ""
                          ? { ...l, resolved: false, hidden: false }
                          : l,
                      ),
                    },
              ),
            },
      ),
    });
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
  const openChoices = schedule ? unresolvedChoices(schedule) : 0;

  return (
    <main className="app" data-theme={theme || undefined}>
      {/* @page can't be set from a class, so the chosen size is injected.
          Without it the browser prints A4 whatever the sheet is laid out for,
          and an A3 schedule comes out cropped. */}
      <style>{`@page { size: ${sheetPaper.css}; margin: 0; }
        .sheet { width: ${sheetPaper.w}; min-height: ${sheetPaper.h}; }`}</style>
      {!schedule && (
        <Landing
          busy={busy}
          error={error}
          onPhoto={pickPhoto}
          onText={(t) => read({ text: t })}
        />
      )}

      {schedule && (
        <>
          <div className="controls no-print">
            {editing ? (
              <>
                {/* The one way onwards, and it is refused while a choice is
                    open. Disabling it with a reason beside it beats letting
                    someone print a sheet that offers five languages at once. */}
                <button
                  className="primary"
                  onClick={() => setMode("view")}
                  disabled={openChoices > 0}
                >
                  Se färdigt schema →
                </button>
                {openChoices > 0 && (
                  <span className="hint">
                    {openChoices === 1
                      ? "1 val kvar att bestämma i schemat"
                      : `${openChoices} val kvar att bestämma i schemat`}
                  </span>
                )}
              </>
            ) : (
              <>
                <button className="primary" onClick={() => window.print()}>
                  Skriv ut
                </button>
                <button onClick={() => setMode("edit")}>← Ändra</button>
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
              </>
            )}
            <button
              style={{ marginLeft: "auto" }}
              onClick={() => {
                setSchedule(null);
                setSource(null);
                setGlossary(EMPTY_GLOSSARY);
                setMode("edit");
              }}
            >
              Börja om
            </button>
          </div>

          {fit < 0.995 && (
            <p className="hint no-print" style={{ marginTop: -8 }}>
              Schemat är högre än en sida och krymps till {Math.round(fit * 100)} % vid utskrift,
              så att allt får plats på ett ark.
            </p>
          )}

          <p className="hint no-print" style={{ marginTop: -8 }}>
            {editing
              ? "Klicka på titeln, en dag eller ett pass för att ändra det."
              : "Så här kommer det ut. Kontrollera mot originalet innan du skriver ut."}
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

          <PrintFit
            pageHeightMm={parseInt(sheetPaper.h, 10)}
            deps={`${JSON.stringify(schedule)}|${editing}|${paper}`}
            onFit={setFit}
          />

          <FitToWidth>
            <ScheduleSheet
              schedule={schedule}
              glossary={glossary}
              editable={editing}
              onChange={setSchedule}
              onEditLesson={(weekId, dayId, lesson) => setOpenLesson({ weekId, dayId, lesson })}
              onAddLesson={addLesson}
              onPickOption={pickOption}
              onReopenChoice={reopenChoice}
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
