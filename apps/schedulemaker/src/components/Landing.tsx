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
import { SAMPLE_SCHEDULE } from "@/lib/sample";
import { EMPTY_GLOSSARY, codesIn, withDefaultColors, withKnownNames } from "@/lib/glossary";

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

const PITFALLS: [string, string][] = [
  [
    "Två veckor är två veckor",
    "Jämna och udda veckor står som två rutnät på skolans papper. Slås de ihop blir onsdagen fel varannan vecka — här förblir de två.",
  ],
  [
    "Ett språkval är ett val",
    "En ruta med franska, spanska och tyska är tre alternativ, inte tre lektioner. Du får peka ut vilket som gäller innan schemat kan skrivas ut.",
  ],
  [
    "Längden betyder något",
    "En lektion är exakt så hög som den är lång, som på skolans eget ark. Ett pass som pågår över elva blir inte borta ur elvaraden.",
  ],
];

export default function Landing({
  busy,
  error,
  onPhoto,
  onText,
}: {
  busy: boolean;
  error: string | null;
  onPhoto: (file: File) => void;
  onText: (text: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  // A screenshot of the school's PDF is already on the clipboard by the time
  // most people get here, and asking them to save it to disk first so they can
  // pick it out of a file dialog is a step that exists for no one's benefit.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (busy) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        onPhoto(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [busy, onPhoto]);

  useEffect(() => {
    if (typing) area.current?.focus();
  }, [typing]);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
    if (file) onPhoto(file);
  };

  return (
    <div
      className={`landing no-print ${dragging ? "dropping" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
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
            <label className={`pickfile ${busy ? "is-busy" : ""}`}>
              <input
                type="file"
                accept="image/*"
                className="filein"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPhoto(f);
                  e.target.value = ""; // so the same file can be picked twice
                }}
              />
              {busy ? "Läser schemat…" : "Välj foto"}
            </label>
            <p className="or" role="status">
              {busy ? (
                "Läser av bilden. Det tar ungefär tio sekunder."
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
                  disabled={busy || text.trim().length < 20}
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
          <FitToWidth>
            <ScheduleSheet schedule={SAMPLE_SCHEDULE} glossary={SAMPLE_GLOSSARY} />
          </FitToWidth>
          <figcaption>Så här kommer det ut. Påhittad klass, riktig utskrift.</figcaption>
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
        <h2>Det som brukar bli fel</h2>
        <p className="lead">
          Ett schema är inte en lista, och de flesta försök att göra om det till en tappar bort
          samma tre saker.
        </p>
        <dl>
          {PITFALLS.map(([term, body]) => (
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
