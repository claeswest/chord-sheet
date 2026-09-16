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
import { SAMPLE_SCHEDULE, SAMPLE_TEACHERS } from "@/lib/sample";
import { EMPTY_GLOSSARY, codesIn, withDefaultColors, withKnownNames } from "@/lib/glossary";
import { THEMES } from "@/lib/themes";

const SAMPLE_SUBJECTS = codesIn(SAMPLE_SCHEDULE).subjects;
const SAMPLE_GLOSSARY = withDefaultColors(
  withKnownNames({ ...EMPTY_GLOSSARY, teachers: SAMPLE_TEACHERS }, SAMPLE_SUBJECTS),
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
  // Not "jämna och udda veckor kan hållas isär": they are deliberately not
  // held apart. Two grids are folded into one week and the lesson that only
  // applies every other week carries the label — which is what the sheet a
  // school prints on one grid does anyway.
  ["Bara de lektioner som gäller", "Välj rätt alternativ vid exempelvis språkval. Gäller en lektion bara varannan vecka står det i rutan."],
  ["Ett schema med personlig stil", "Välj bland stilar med olika typsnitt och färger, lägg till ämnessymboler och sätt barnets namn överst."],
];

// Written against real printouts rather than against an idea of what school
// schedules are like, and shown against one of them: the photograph beside
// this list is the same week as the sample sheet at the top of the page, as
// the school printed it. Every fault is pinned to the place on that sheet
// where it happens, so the list is a caption for a picture rather than a set
// of claims to take on trust.
//
// None of it is phrased as a complaint about schools. It is what a
// timetabling system prints when nobody has looked at the paper — and the
// reader did not make this sheet either, so it is not about theirs.
//
// `at` is the pin's position on public/solglantan.webp, in percent of its
// width and height. It is set beside the thing rather than on it, so the
// fault stays visible under its number.
type Fault = { term: string; body: React.ReactNode; at: [number, number] };

const FAULTS: Fault[] = [
  {
    term: "Koder i stället för ord",
    // Subjects as well as teachers: TK is not obviously teknik to everyone,
    // and a parent who didn't go to a Swedish school has no way in at all.
    // The closing example is Friday's TK with MTP, which the sample above
    // prints as Teknik and Mattias — both halves of the fault in one box.
    // SO and NO are left as codes on purpose (see KNOWN_SUBJECTS), so this
    // doesn't claim every code becomes a word.
    //
    // The pin is under Monday's "IDH VSL Sporthallen" rather than at Friday's
    // TK: that box is too narrow to hold a pin without covering the code it
    // points at, and IDH VSL is the same fault with grey space beneath it.
    body: (
      <>
        TK, IDH och BL för ämnena, KRN, MTP och QRP för lärarna — och ingen förklaring någonstans.
        Alla vet inte att TK är teknik, eller att ”SL TX” är textilslöjd. Ett ark vi tittat på har
        till och med en avkodningstabell längst ner: utskriften erkänner själv att den inte går att
        läsa. Vi skriver så alla lättare förstår: <strong>Teknik</strong>, och <strong>Mattias</strong>.
      </>
    ),
    at: [18.9, 73.2],
  },
  {
    // The grey belongs to this fault rather than a seventh: it is printed on
    // exactly the empty half, so it is the same waste seen twice — the most
    // ink where there is least to say. 60% is measured, not guessed: pixels
    // of low saturation and mid lightness inside the day columns of the
    // photo, 06:00 to 17:30, came to 59.1%.
    term: "Halva pappret är tomt — och grått",
    body: "Tidsaxeln börjar 06:00 och slutar 17:30, för att programmet skriver ut hela institutionens dygn. Skoldagen är sex timmar av det. Resten är inte ens tomt, utan tryckt i grått: knappt 60 procent av rutnätet är grå färg. Mest bläck där det står minst, och ett ark som ser tungt och trist ut. Vår axel börjar när första lektionen börjar, och standardstilen lämnar det tomma vitt. Bläcksnålt läge tar bort alla fyllningar, i vilken stil som helst.",
    at: [49.7, 82.8],
  },
  {
    term: "Allt är lika viktigt",
    body: "Ämne och lärare sätts i samma grad och samma vikt — ”SO KRN” — så ögat har inget att fästa vid. Hos oss är ämnet störst, och lärare och sal står dämpat intill.",
    at: [64.5, 74.1],
  },
  {
    term: "Färg som slåss med texten",
    body: "Svart text på mättat rött och olivgrönt. Färgen finns där för att hjälpa och gör tvärtom. Våra toner är bleka nog att texten ligger stilla ovanpå, och varje ämne får en nyans som inte går att förväxla med grannens.",
    at: [48.8, 47.3],
  },
  {
    term: "Klockslagen ligger i vägen",
    body: "Tiderna är småetiketter klistrade på rutornas kanter, tvärs över linjerna, i en grad som knappt går att läsa. Hos oss står tiden en gång, inne i rutan, med siffror som linjerar rakt ner.",
    at: [20.3, 45.0],
  },
  {
    // Not "rasten syns inte": on this sheet it does — white on the grey.
    // Lunch is the one that hides, as a box among the lessons.
    term: "Lunchen ser ut som en lektion",
    body: "Rasten får en vit ruta och syns. Lunchen gör det inte: den är en brun ruta med samma sorts text som lektionerna, i nästan samma färg som idrotten. Men lunchen är dagens fasta punkt — ”före lunch” och ”efter lunch” är hur ett barn beskriver sin dag. Hos oss är den ett eget band med kniv och gaffel.",
    at: [36.8, 60.0],
  },
];

// A second sheet, for what the first one doesn't do. Only faults that are new
// here: this one is grey and full of codes too, but ① and ② already say so,
// and saying it twice would make the list longer without making it truer.
const MORE_FAULTS: Fault[] = [
  {
    term: "Alla språkval i samma ruta",
    body: "Måndag 08:10: engelska, franska, spanska i två grupper och tyska, med lärare och sal för varje — fem rader i en text som kräver förstoringsglas. Samma ruta igen på onsdag. Barnet läser ett av språken. Hos oss pekar du ut vilket, och de andra fyra försvinner från arket.",
    at: [19.8, 24.2],
  },
  {
    // Ink-saving is also colourless, which is why the last sentence is there:
    // the fault is not the absence of colour but that nobody chose it.
    term: "Ingen färg alls",
    body: "Varje lektion är en likadan vit ruta. För att hitta veckans alla mattelektioner får man läsa varenda en, och lunchen ser ut precis som matten. Färg är det snabbaste sättet att hitta i en vecka, och här finns ingen. Hos oss får varje ämne en egen blek ton och lunchen ett eget band. Svartvitt är ett val du gör för din skrivare, inte något arket bestämt åt dig.",
    at: [35.9, 49.0],
  },
];

/**
 * The photographs, each with the faults pinned to it.
 *
 * Both were rebuilt by the parent they belong to with invented schools,
 * years and teacher codes before they came here — see docs/schedulemaker.md.
 * The first is the same week as the sample sheet; the second is not, and its
 * caption does not claim to be.
 */
const SPECIMENS: {
  src: string;
  size: [number, number];
  alt: string;
  caption: string;
  faults: Fault[];
}[] = [
  {
    src: "/solglantan.webp",
    size: [900, 990],
    alt: "Foto av ett utskrivet skolschema för klass 3B: tidsaxel från 06:00 till 17:30 där mer än hälften är grått, lektioner i mättade färger märkta med förkortningar som SO, MA och KRN, och små klockslag på rutornas kanter.",
    caption:
      "Samma vecka som exemplet högst upp, så som den kom hem från skolan. Skola och lärare är anonymiserade.",
    faults: FAULTS,
  },
  {
    src: "/manskensskolan.webp",
    size: [900, 994],
    alt: "Foto av ett utskrivet högstadieschema för klass 7B, helt i svartvitt: vita lektionsrutor på grå botten, förkortningar som NO, HeLo och Sl tx, och en måndagsruta med fem språkval i mycket liten text.",
    caption: "Ett högstadieschema från en annan skola. Skola och lärare är anonymiserade.",
    faults: MORE_FAULTS,
  },
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
  /** Which fault the pointer is on, so its pin on the photo can answer. */
  const [pointing, setPointing] = useState<number | null>(null);
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
                    <span className="on-mouse">
                      Dra bilden hit eller klistra in med <kbd>Ctrl</kbd> + <kbd>V</kbd>
                    </span>
                    <span className="on-touch">Fota schemat eller välj en bild du redan har.</span>
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

          {/* One line, not the privacy paragraph: that argument is made once,
              at the foot of the page, and making it twice reads as protesting.
              What belongs beside the button is only what you need before you
              press it. */}
          <p className="fineprint">Inget konto. Ingenting sparas hos oss.</p>
        </div>

        {/* The label is visible text inside the figure, so it is the figure's
            accessible name already. An aria-label on top of it made a screen
            reader read the same sentence twice. */}
        <figure className="hero-sheet">
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
                : THEMES.find((t) => t.id === theme)?.note}
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

      <section className="pitfalls" aria-labelledby="pitfalls-heading">
        {/* Not "arket du fått hem". Second person turns an observation about
            what timetabling software prints into an accusation about the
            reader's own child's sheet, which they did not choose and cannot
            help. The faults are general; the fix is ours. */}
        <h2 id="pitfalls-heading">Vanliga fel med de scheman som barnen får med sig hem</h2>
        <p className="lead">
          Ingenting av det här är skolans fel. Det är vad ett schemaläggningsprogram skriver ut när
          ingen har tittat på papperet efteråt — och det är precis de sakerna vi rättar.
        </p>
        {SPECIMENS.map((s, si) => {
          // Numbered straight through, so the second sheet's faults read as
          // more of the same list rather than a new one starting again at 1.
          const first = SPECIMENS.slice(0, si).reduce((n, p) => n + p.faults.length, 0);
          return (
            <div key={s.src} className={`pitfalls-body ${si % 2 ? "flip" : ""}`}>
              <figure className="specimen">
                <div className="specimen-img">
                  <img src={s.src} width={s.size[0]} height={s.size[1]} loading="lazy" alt={s.alt} />
                  {/* Decorative: the numbers in the list carry the meaning, and a
                      screen reader would otherwise hear "1 2 3 4 5 6" first. */}
                  {s.faults.map((f, i) => (
                    <span
                      key={f.term}
                      className={`pin ${pointing === first + i ? "on" : ""}`}
                      style={{ left: `${f.at[0]}%`, top: `${f.at[1]}%` }}
                      aria-hidden
                      onMouseEnter={() => setPointing(first + i)}
                      onMouseLeave={() => setPointing(null)}
                    >
                      {first + i + 1}
                    </span>
                  ))}
                </div>
                <figcaption>{s.caption}</figcaption>
              </figure>

              <ol className="faults" start={first + 1}>
                {s.faults.map((f, i) => (
                  <li
                    key={f.term}
                    className={pointing === first + i ? "on" : undefined}
                    onMouseEnter={() => setPointing(first + i)}
                    onMouseLeave={() => setPointing(null)}
                  >
                    <h3>
                      <span className="faultno" aria-hidden>
                        {first + i + 1}
                      </span>
                      {f.term}
                    </h3>
                    <p>{f.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </section>

      <footer className="landing-foot">
        <h2>Inget konto behövs</h2>
        <p>
          Ett barns schema är namn, klass, skola och var de befinner sig varje timme på dygnet. Det
          billigaste sättet att ta hand om sådant är att inte ha det: fotot skickas till Google för
          avläsning och sparas inte av oss, och schemat du gjort ligger kvar i den här webbläsaren.
          Ingen databas, ingenting på en server.
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
