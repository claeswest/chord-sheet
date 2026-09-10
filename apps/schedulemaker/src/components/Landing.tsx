"use client";

// The front page.
//
// It shows the thing itself. Every claim this page could make about the sheet
// — that lessons are as tall as they are long, that lunch reads as lunch, that
// the codes come out as words — is visible in ten seconds by looking at one,
// and a page of feature cards describing it would be a worse version of the
// same information. So the hero is a real ScheduleSheet, rendered by the same
// component and the same stylesheet that print uses, from an invented week.
//
// The three ways in are ranked by how people actually arrive: a photo from a
// phone, an image dragged or pasted from a desktop, and typed text last. Only
// the first is a button; the other two are things the page already accepts
// without being asked.

import { useEffect, useRef, useState } from "react";
import ScheduleSheet from "./ScheduleSheet";
import FitToWidth from "./FitToWidth";
import Check from "./Check";
import { SAMPLE_SCHEDULE } from "@/lib/sample";
import { EMPTY_GLOSSARY, codesIn, withDefaultColors, withKnownNames } from "@/lib/glossary";
import { THEMES } from "@/lib/themes";

const SAMPLE_SUBJECTS = codesIn(SAMPLE_SCHEDULE).subjects;
const SAMPLE_GLOSSARY = withDefaultColors(
  withKnownNames(EMPTY_GLOSSARY, SAMPLE_SUBJECTS),
  SAMPLE_SUBJECTS,
);

/** Steps, in the sheet's own hour-label type. */
const STEPS: [string, string, string][] = [
  [
    "01",
    "Fotografera",
    "Mobilkameran räcker. Sneda bilder, skuggor och skrynkligt papper går bra — det är så scheman ser ut när de kommit hem i en ryggsäck.",
  ],
  [
    "02",
    "Rätta och namnge",
    "Koderna blir ord. SV blir Svenska av sig självt, DLE blir Denise när du skrivit det en gång. Står det fem språk i samma ruta pekar du ut det ditt barn faktiskt läser.",
  ],
  [
    "03",
    "Skriv ut",
    "Ett ark, inte två. A4 eller A3, liggande eller stående, i färg eller bläcksnålt svartvitt.",
  ],
];

// Written against three real printouts — a lower-secondary, an upper-secondary
// and an F-6 — rather than against an idea of what school schedules are like.
// Every left-hand side here is something one of those three sheets actually
// does, which is why none of them is phrased as a complaint about schools: they
// are all what a timetabling system prints when nobody has looked at the paper.
const FAULTS: [string, string][] = [
  [
    "Koder i stället för ord",
    "DLE, AAC, 21SVESVESVE01bSA21A. Ett av arken vi tittat på bär en avkodningstabell längst ner — utskriften erkänner själv att den inte går att läsa. Här står det Svenska, och Denise.",
  ],
  [
    "Halva pappret är tomt",
    "Tidsaxeln börjar 06:00 och slutar 17:30, för att programmet skriver ut hela institutionens dygn. Skoldagen är sex timmar av det; resten är grått. Vår axel börjar när första lektionen börjar.",
  ],
  [
    "Allt är lika viktigt",
    "Ämne, lärare och sal sätts i samma grad och samma vikt — ”SO LoAl 401” — så ögat har inget att fästa vid. Hos oss är ämnet störst och salen dämpad.",
  ],
  [
    "Färg som slåss med texten",
    "Svart text på mättat rött och olivgrönt. Färgen finns där för att hjälpa och gör tvärtom. Våra toner är bleka nog att texten ligger stilla ovanpå, och varje ämne får en nyans som inte går att förväxla med grannens.",
  ],
  [
    "Klockslagen ligger i vägen",
    "Tiderna är småetiketter klistrade på rutornas kanter, tvärs över linjerna, i en grad som knappt går att läsa. Hos oss står tiden en gång, inne i rutan, med siffror som linjerar rakt ner.",
  ],
  [
    "Rasten syns inte",
    "Lunchen är en ruta som alla andra, i samma färg som en lektion. Det är dagens fasta punkt — ”före lunch” och ”efter lunch” är hur ett barn beskriver sin dag. Hos oss är den ett eget band med kniv och gaffel.",
  ],
];

export default function Landing({
  busy,
  phase,
  error,
  onPhoto,
  onText,
  theme,
  onTheme,
  ink,
  onInk,
  icons,
  onIcons,
}: {
  busy: boolean;
  phase: null | "shrink" | "read";
  error: string | null;
  onPhoto: (file: File) => void;
  onText: (text: string) => void;
  theme: string;
  onTheme: (id: string) => void;
  ink: boolean;
  onInk: (on: boolean) => void;
  icons: boolean;
  onIcons: (on: boolean) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const working = busy || phase !== null;

  /**
   * Seconds since the import started.
   *
   * The only honest number available: nothing between "sent" and "answered" is
   * observable from a browser, so a progress bar would be a drawing of a
   * guess. Elapsed time is measured, and it is what lets the page stop
   * promising ten seconds once ten seconds have passed.
   */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!working) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [working]);

  const waiting =
    elapsed < 12
      ? "Schemat analyseras — dagar, tider, ämnen och lärarkoder läses av. Det brukar ta ett tiotal sekunder."
      // Measured, not guessed: a photographed 7A högstadieschema with 43
      // lessons took 36 seconds. "Half a minute" was already wrong for it.
      : "Det tar längre än vanligt. Ett tätt schema kan behöva en minut.";

  // A screenshot of the school's PDF is already on the clipboard by the time
  // most people get here, and asking them to save it to disk first so they can
  // pick it out of a file dialog is a step that exists for no one's benefit.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (working) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        onPhoto(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [working, onPhoto]);

  useEffect(() => {
    if (typing) area.current?.focus();
  }, [typing]);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (working) return;
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
    if (file) onPhoto(file);
  };

  return (
    <div
      className={`landing no-print ${dragging ? "dropping" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!working) setDragging(true);
      }}
      onDragLeave={(e) => {
        // Only when the pointer has actually left the page, not when it
        // crosses from one child to the next.
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={drop}
    >
      <header className="masthead">
        <span className="mark" aria-hidden />
        <span className="wordmark">Schemat</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h1>
            Ett skolschema som går att läsa på kylskåpsdörren
          </h1>
          <p className="lead">
            Fotografera arket skolan skickade hem. Du får tillbaka det i rätt proportioner, med
            lärarkoderna utskrivna i klartext och ämnena i färg — färdigt att skriva ut på ett enda
            A4.
          </p>

          <div className="start">
            {/* The input is transparent and laid over the label rather than
                hidden. `hidden` takes it out of the tab order too, which left
                the one action on this page unreachable from a keyboard. */}
            <label className={`pickfile ${working ? "is-working" : ""}`}>
              <input
                type="file"
                accept="image/*"
                className="filein"
                disabled={working}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPhoto(f);
                  e.target.value = ""; // so the same file can be picked twice
                }}
              />
              {working ? (
                <>
                  <span className="spinner" aria-hidden />
                  {phase === "shrink" ? "Förminskar bilden" : "Läser av schemat"}
                </>
              ) : (
                "Välj foto"
              )}
            </label>
            <p className="or" role="status">
              {working ? (
                waiting
              ) : (
                <>
                  eller dra hit bilden — eller klistra in den med <kbd>Ctrl</kbd> + <kbd>V</kbd>
                </>
              )}
            </p>
          </div>

          {!typing ? (
            <button className="linky" onClick={() => setTyping(true)}>
              Har du bara texten? Skriv in den i stället →
            </button>
          ) : (
            <div className="typein">
              <label htmlFor="paste">Skriv eller klistra in schemat</label>
              <textarea
                id="paste"
                ref={area}
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Måndag\n08:10–09:00 Svenska, sal 12\n09:10–10:00 Matematik, sal 12"}
              />
              <div className="typein-actions">
                <button
                  className="primary"
                  disabled={working || text.trim().length < 20}
                  onClick={() => onText(text)}
                >
                  Läs schemat
                </button>
                <button className="linky" onClick={() => setTyping(false)}>
                  Avbryt
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <p className="fineprint">
            Fotot skickas till Google för att läsas av och sparas inte hos oss. Det färdiga schemat
            ligger kvar i den här webbläsaren och når aldrig våra servrar.
          </p>
        </div>

        <figure className="hero-sheet" aria-label="Exempel på ett färdigt schema">
          {/* The style is applied to this figure, so the swatches below change
              the actual sheet rather than a picture of one — and the choice is
              lifted to the app, so it is still yours after you upload. */}
          <div className="paper" data-theme={theme || undefined} data-ink={ink ? "save" : undefined}>
            <FitToWidth>
              <ScheduleSheet schedule={SAMPLE_SCHEDULE} glossary={SAMPLE_GLOSSARY} icons={icons} />
            </FitToWidth>
          </div>

          <div className="styles" role="group" aria-label="Stil på schemat">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className="style"
                aria-pressed={theme === t.id}
                onClick={() => onTheme(t.id)}
                title={t.note}
              >
                <span className="style-dot" style={{ background: t.dot }} aria-hidden />
                {t.name}
              </button>
            ))}
          </div>
          {/* Under the styles rather than in the row, because it is not one of
              them: it applies to whichever style is chosen, and it is a
              question about your printer rather than your taste. */}
          <div className="inkrow">
            <Check label="Bläcksnål utskrift" hint="inga fyllningar, svart på vitt" on={ink} onChange={onInk} />
            <Check label="Ämnessymboler" hint="en liten bild per ämne" on={icons} onChange={onIcons} />
          </div>
          <figcaption>
            {ink
              ? "Stilens typsnitt är kvar; färgerna sparas till skärmen."
              : THEMES.find((t) => t.id === theme)?.note}{" "}
            Allt du väljer här följer med till ditt eget schema.
          </figcaption>
        </figure>
      </section>

      <section className="steps">
        {STEPS.map(([n, title, body]) => (
          <article key={n}>
            <span className="stepno">{n}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="pitfalls">
        <h2>Sex saker som är fel på arket du fått hem</h2>
        <p className="lead">
          Ingenting av det här är skolans fel. Det är vad ett schemaläggningsprogram skriver ut när
          ingen har tittat på papperet efteråt — och det är precis de sex sakerna vi rättar.
        </p>
        <dl>
          {FAULTS.map(([term, body]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="landing-foot">
        <p>
          Ett barns schema är namn, klass, skola och var de befinner sig varje timme på dygnet. Det
          billigaste sättet att ta hand om sådant är att inte ha det: här finns inget konto, ingen
          databas och ingenting sparat på en server.
        </p>
      </footer>

      {dragging && (
        <div className="dropnote" aria-hidden>
          Släpp bilden här
        </div>
      )}
    </div>
  );
}
