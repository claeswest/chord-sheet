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

const STEPS: [string, string, string][] = [
  ["01", "Ladda upp ditt schema", "Ta ett tydligt foto, dra in en bild eller klistra in schemat som text."],
  ["02", "Gör det till ditt", "Kontrollera tiderna, skriv ut lärarnas namn och välj rätt lektioner. Anpassa färger och stil efter smak."],
  ["03", "Skriv ut", "Välj A4 eller A3, stående eller liggande. Skriv ut i färg eller välj bläcksnålt läge."],
];

const BENEFITS: [string, string][] = [
  ["Begripliga namn", "Vanliga ämnesförkortningar skrivs ut automatiskt. Lärarnas namn fyller du i en gång."],
  ["Skoldagen i rätt proportioner", "Långa lektioner får större rutor och mellanrummen visar dagens pauser."],
  ["Det viktigaste syns först", "Ämnet står tydligt, med tid, lärare och sal intill."],
  ["En färg för varje ämne", "Följ ämnena genom veckan med färger du själv kan ändra."],
  ["Bara de lektioner som gäller", "Välj rätt alternativ vid exempelvis språkval. Jämna och udda veckor kan hållas isär."],
  ["Ett schema med personlig stil", "Välj bland stilar med olika typsnitt och färger, lägg till ämnessymboler och sätt barnets namn överst."],
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
            Gör skolschemat tydligt och personligt
          </h1>
          <p className="lead">
            Ladda upp skolans schema, välj en stil och kontrollera innehållet.
            Skriv sedan ut det till kylskåpet, skrivbordet eller skolväskan.
          </p>

          <div className="upload-panel">
          <h2>Börja med ditt schema</h2>
          <p className="upload-hint">Ett tydligt foto eller en skärmbild räcker.</p>
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
                "Ladda upp en bild"
              )}
            </label>
            <p className="or" role="status">
              {working ? (
                waiting
              ) : (
                <>
                  Dra bilden hit eller klistra in med <kbd>Ctrl</kbd> + <kbd>V</kbd>
                </>
              )}
            </p>
          </div>

          {!typing ? (
            <button className="linky" onClick={() => setTyping(true)}>
              Klistra in schema som text →
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

          </div>
          <p className="fineprint">
            Inget konto behövs. Bilden skickas till Google för avläsning och sparas inte av oss.
            Dina ändringar sparas i den här webbläsaren.
          </p>
        </div>

        <figure className="hero-sheet" aria-label="Exempel på ett färdigt schema">
          {/* The style is applied to this figure, so the swatches below change
              the actual sheet rather than a picture of one — and the choice is
              lifted to the app, so it is still yours after you upload. */}
          <p className="preview-label">Exempel på ett färdigt schema</p>
          <div className="paper" data-theme={theme || undefined} data-ink={ink ? "save" : undefined}>
            <FitToWidth>
              <ScheduleSheet schedule={SAMPLE_SCHEDULE} glossary={SAMPLE_GLOSSARY} icons={icons} />
            </FitToWidth>
          </div>

          <div className="style-panel">
          <h2>Välj din stil</h2>
          <p className="style-intro">Prova på exemplet. Dina val följer med när du laddar upp.</p>
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
            <Check label="Bläcksnål utskrift" hint="svart på vitt, utan färgfyllningar" on={ink} onChange={onInk} />
            <Check label="Ämnessymboler" hint="visa en ikon vid ämnet" on={icons} onChange={onIcons} />
          </div>
          <p className="style-note" aria-live="polite">
            {ink
              ? "Svart text på vitt, utan färgfyllningar. Typsnittet behålls."
              : THEMES.find((t) => t.id === theme)?.note}{" "}

          </p>
          </div>
        </figure>
      </section>

      <section className="steps" aria-label="Så fungerar det">
        {STEPS.map(([n, title, body]) => (
          <article key={n}>
            <span className="stepno">{n}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="benefits" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading">Lättare att läsa. Enklare att använda.</h2>
        <p className="lead">
          Ett tydligt schema hjälper hela familjen att få koll på skolveckan.
        </p>
        <dl>
          {BENEFITS.map(([term, body]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="landing-foot">
        <h2>Inget konto behövs</h2>
        <p>
          Fotot skickas till Google för avläsning och sparas inte av oss.
          Ditt schema och dina ändringar sparas lokalt i den här webbläsaren.
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
