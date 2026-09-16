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
import Check from "@/components/Check";
import Stepper from "@/components/Stepper";
import { PrintIcon, RestartIcon } from "@/components/UiIcon";
import Landing from "@/components/Landing";
import {
  EMPTY_GLOSSARY,
  codesIn,
  normalizeGlossary,
  withDefaultColors,
  withKnownNames,
  type Glossary,
} from "@/lib/glossary";
import { THEMES } from "@/lib/themes";
import { unresolvedChoices, type Lesson, type Schedule } from "@/types/schedule";

const STORE = "sm_state_v1";

/** Paper the sheet is laid out for. A3 is the same document, printed larger. */
const PAPERS = [
  { id: "a4-landscape", name: "A4 liggande", css: "A4 landscape", w: "297mm", h: "210mm" },
  { id: "a4-portrait", name: "A4 stående", css: "A4 portrait", w: "210mm", h: "297mm" },
  { id: "a3-landscape", name: "A3 liggande", css: "A3 landscape", w: "420mm", h: "297mm" },
  { id: "a3-portrait", name: "A3 stående", css: "A3 portrait", w: "297mm", h: "420mm" },
];

type Stored = {
  schedule: Schedule;
  glossary: Glossary;
  theme: string;
  paper?: string;
  ink?: boolean;
  icons?: boolean;
  illustration?: boolean;
};

export default function Home() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [glossary, setGlossary] = useState<Glossary>(EMPTY_GLOSSARY);
  const [theme, setTheme] = useState("");
  const [paper, setPaper] = useState("a4-landscape");
  /** Print without fills, whatever the style. A fact about the printer. */
  const [ink, setInk] = useState(false);
  /** Little subject drawings. Fun, and findable by a child who cannot read yet. */
  const [icons, setIcons] = useState(true);
  const [illustration, setIllustration] = useState(true);
  /** "Börja om" is armed before it fires. See the toolbar. */
  const [resetting, setResetting] = useState(false);
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
  /** Which of the two real stages of an import is running. */
  const [phase, setPhase] = useState<null | "shrink" | "read">(null);
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
          // "plain" was the ink-saving style before it became a switch.
          // Restoring it as a style id would leave the setting silently off.
          setTheme(s.theme === "plain" ? "" : s.theme ?? "");
          setInk(s.ink ?? s.theme === "plain");
          setIcons(s.icons ?? true);
          setIllustration(s.illustration ?? true);
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
      if (schedule)
        localStorage.setItem(STORE, JSON.stringify({ schedule, glossary, theme, paper, ink, icons, illustration }));
      else localStorage.removeItem(STORE);
    } catch {
      /* a full or disabled store just means edits don't survive a reload */
    }
  }, [loaded, schedule, glossary, theme, paper, ink, icons, illustration]);

  async function read(payload: { image?: string; text?: string }) {
    setBusy(true);
    setPhase("read");
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
      setError("Kunde inte ansluta. Kontrollera internetanslutningen och försök igen.");
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  async function pickPhoto(file: File) {
    setError(null);
    // Two stages, and both are real: a phone photo is shrunk here in the
    // browser before anything is sent. Naming them beats one label for ten
    // seconds — and inventing a third would be theatre, since nothing between
    // "sent" and "answered" is observable from here.
    setPhase("shrink");
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
      setError("Kunde inte öppna bilden. Prova en JPG- eller PNG-bild.");
      setPhase(null);
    }
  }

  function startOver() {
    setSchedule(null);
    setSource(null);
    setGlossary(EMPTY_GLOSSARY);
    setMode("edit");
    setResetting(false);
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

  // The style belongs to the sheet, not the page. It used to be set up here
  // once a schedule existed, and everything in the app that reads the style's
  // variables took its colours: on Skymning the editor's hint lines came out
  // lilac on light grey, a colour meant for dark paper. It is set on a box
  // around the sheet now, as the front page already did for its preview.
  return (
    <main className="app">
      {/* @page can't be set from a class, so the chosen size is injected.
          Without it the browser prints A4 whatever the sheet is laid out for,
          and an A3 schedule comes out cropped. */}
      <style>{`@page { size: ${sheetPaper.css}; margin: 0; }
        .sheet { width: ${sheetPaper.w}; min-height: ${sheetPaper.h}; }`}</style>
      {!schedule && (
        <Landing
          busy={busy}
          phase={phase}
          error={error}
          onPhoto={pickPhoto}
          onText={(t) => read({ text: t })}
          theme={theme}
          onTheme={setTheme}
          ink={ink}
          onInk={setInk}
          icons={icons}
          onIcons={setIcons}
          illustration={illustration}
          onIllustration={setIllustration}
        />
      )}

      {schedule && (
        <>
          {/* Where you are in the job, and the way out of it. "Börja om" sat
              among print and back, which are moves within the job; it throws
              the schedule away and takes you to step one, so it lives on the
              row that shows step one. */}
          <div className="flowbar no-print">
            <Stepper
              current={editing ? 2 : 3}
              onGo={(step) => setMode(step === 3 ? "view" : "edit")}
              blocked={
                openChoices > 0
                  ? {
                      step: 3,
                      reason:
                        openChoices === 1
                          ? "Välj först vilka lektioner som gäller i 1 ruta"
                          : `Välj först vilka lektioner som gäller i ${openChoices} rutor`,
                    }
                  : undefined
              }
            />
            {/* One click used to throw away the schedule, and naming a set of
                teacher codes is an afternoon. It asks now. */}
            {resetting ? (
              <span className="confirm">
                Ta bort det sparade schemat och börja om?
                <button className="danger" onClick={startOver}>
                  Ja, ta bort
                </button>
                <button className="quiet" onClick={() => setResetting(false)}>
                  Avbryt
                </button>
              </span>
            ) : (
              <button className="quiet with-icon" onClick={() => setResetting(true)}>
                <RestartIcon />
                Börja om
              </button>
            )}
          </div>

          {/* In the order the job is done: what the sheet looks like first,
              then the buttons. Print used to sit above the settings, which is
              pressing the button before choosing what it prints. Back is on
              the left and onwards on the right, the direction the steps run,
              and onwards is in the same place on steps two and three. */}
          <div className="toolbar no-print">
            {!editing && (
              <div className="settings">
                <div className="setgroup" role="group" aria-label="Stil">
                  <span className="setlabel">Stil</span>
                  <div className="swatches">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        className="swatch"
                        style={{ background: t.dot }}
                        aria-label={t.name}
                        title={t.name}
                        aria-pressed={theme === t.id}
                        onClick={() => setTheme(t.id)}
                      />
                    ))}
                  </div>
                  {/* Named, because eight dots cannot say which is which. */}
                  <span className="setvalue">{THEMES.find((t) => t.id === theme)?.name}</span>
                </div>

                <div className="setgroup">
                  {/* "Format", not "Papper": the default style is itself called
                      Papper, and "Stil: Papper | Papper: A4 liggande" is not a
                      sentence anyone can read. */}
                  <span className="setlabel">Format</span>
                  <select
                    value={paper}
                    onChange={(e) => setPaper(e.target.value)}
                    aria-label="Pappersformat"
                  >
                    {PAPERS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="setgroup">
                  {/* Beside the styles, not among them: they apply to whichever
                      one is chosen. */}
                  <Check label="Bläcksnål utskrift" on={ink} onChange={setInk} />
                  <Check label="Ämnessymboler" on={icons} onChange={setIcons} />
                  <Check label="Illustration" on={illustration} onChange={setIllustration} />
                </div>
              </div>
            )}

            <div className="actions">
              {editing ? (
                <>
                  {openChoices > 0 && (
                    <span className="hint">
                      {openChoices === 1
                        ? "Välj vilka lektioner som gäller i 1 ruta."
                        : `Välj vilka lektioner som gäller i ${openChoices} rutor.`}
                    </span>
                  )}
                  {/* The one way onwards, and it is refused while a choice is
                      open. Disabling it with a reason beside it beats letting
                      someone print a sheet that offers five languages at once. */}
                  <button
                    className="primary onward"
                    onClick={() => setMode("view")}
                    disabled={openChoices > 0}
                  >
                    Nästa: Skriv ut →
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setMode("edit")}>← Redigera</button>
                  <button className="primary onward with-icon" onClick={() => window.print()}>
                    <PrintIcon />
                    Skriv ut
                  </button>
                </>
              )}
            </div>
          </div>

          {fit < 0.995 && (
            <p className="hint no-print" style={{ marginTop: -8 }}>
              Schemat är högre än en sida och krymps till {Math.round(fit * 100)} % vid utskrift,
              så att allt får plats på ett ark.{" "}
              {/* Below three quarters the type is getting genuinely small — a
                  two-week schedule lands around 66% on A4. A3 is the same
                  document on bigger paper and measured 93% for that case, so
                  the promise here is "clearer", not "full size": the first
                  draft of this line said full size and the measurement said
                  otherwise. */}
              {fit < 0.75 && paper.startsWith("a4") && (
                <>
                  På A3 blir texten tydligare — samma ark, större papper.{" "}
                  <button
                    className="linky"
                    style={{ marginTop: 0 }}
                    onClick={() => setPaper(paper === "a4-portrait" ? "a3-portrait" : "a3-landscape")}
                  >
                    Byt till A3
                  </button>
                </>
              )}
            </p>
          )}

          <p className="hint no-print" style={{ marginTop: -8 }}>
            {editing ? (
              <>
                <span className="on-mouse">Klicka</span>
                <span className="on-touch">Tryck</span> på en rubrik, dag eller lektionsruta för att redigera. Kontrollera AI-avläsningen mot originalet.
              </>
            ) : (
              "Kontrollera tider och lektioner mot originalet. Välj sedan Skriv ut för att skriva ut eller spara som PDF."
            )}
          </p>

          {error && <p className="error no-print">{error}</p>}

          {editing && (
            <GlossaryPanel schedule={schedule} glossary={glossary} onChange={setGlossary} />
          )}

          {editing && source && (
            <details className="panel no-print">
              <summary>
                <span className="panel-title">Originalet</span>
                <span className="hint"> — jämför tider och lektioner</span>
              </summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt="Det fotograferade schemat" className="source-photo" />
            </details>
          )}

          <PrintFit
            pageHeightMm={parseInt(sheetPaper.h, 10)}
            deps={`${JSON.stringify(schedule)}|${editing}|${paper}|${theme}|${ink}|${icons}|${illustration}`}
            onFit={setFit}
          />

          <FitToWidth readable scrollHint="Svep i sidled för att se hela veckan.">
            {/* Inside the scaler, so its own hint above stays in the app's
                colours. A plain block, not display: contents — FitToWidth
                measures its first child, and a contents box measures zero. */}
            <div className="sheet-theme" data-theme={theme || undefined} data-ink={ink ? "save" : undefined}>
              <ScheduleSheet
                schedule={schedule}
                glossary={glossary}
                editable={editing}
                icons={icons}
                theme={theme}
                illustration={illustration}
                onChange={setSchedule}
                onEditLesson={(weekId, dayId, lesson) => setOpenLesson({ weekId, dayId, lesson })}
                onAddLesson={addLesson}
                onPickOption={pickOption}
                onReopenChoice={reopenChoice}
              />
            </div>
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
