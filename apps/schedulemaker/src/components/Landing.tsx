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
import { LogoMark, SITE_NAME } from "./Logo";
import Stepper from "./Stepper";
import { SAMPLE_SCHEDULE, SAMPLE_TEACHERS } from "@/lib/sample";
import { EMPTY_GLOSSARY, codesIn, withDefaultColors, withKnownNames } from "@/lib/glossary";
import { THEMES } from "@/lib/themes";

const SAMPLE_SUBJECTS = codesIn(SAMPLE_SCHEDULE).subjects;
const SAMPLE_GLOSSARY = withDefaultColors(
  withKnownNames({ ...EMPTY_GLOSSARY, teachers: SAMPLE_TEACHERS }, SAMPLE_SUBJECTS),
  SAMPLE_SUBJECTS,
);

// The voice, everywhere on this page: one parent to another. Short sentences,
// everyday words, a concrete morning rather than an abstract benefit — the
// fridge, a Tuesday, "MA blir Matematik". Light, but never cute at the cost of
// being clear, and never a promise the app doesn't keep: the AI reading, where
// the photo goes and where the schedule is kept are all still said plainly.

const STEPS: [string, string, string][] = [
  ["01", "Fota schemat", "Ta en bild med mobilen, dra in en skärmbild eller klistra in texten. Lite snett eller skrynkligt går bra."],
  ["02", "Gör det till ert", "Skriv in lärarnas namn en gång, välj rätt språk och slöjd, och kolla att tiderna stämmer."],
  ["03", "Upp på kylskåpet", "Välj färger och stil, och skriv ut på A4 eller A3 – eller spara som PDF."],
];

const BENEFITS: [string, string][] = [
  ["Namn i stället för koder", "MA blir Matematik och KRN blir Karin. Lärarnas namn skriver du in en gång – sen står de överallt."],
  ["Hela dagen i rätt proportioner", "En lång lektion blir en stor ruta. Du ser direkt när det är rast och när skoldagen slutar."],
  ["Det viktiga först", "Ämnet syns tydligast. Tid, lärare och sal står i mindre text bredvid."],
  ["En färg per ämne", "Matten har alltid samma färg, så den är lätt att hitta hela veckan. Byt färger om ni vill."],
  // Not "jämna och udda veckor kan hållas isär": they are deliberately not
  // held apart. Two grids are folded into one week and the lesson that only
  // applies every other week carries the label — which is what the sheet a
  // school prints on one grid does anyway.
  ["Bara det som gäller ditt barn", "Fem språk i samma ruta? Välj det ditt barn läser, så försvinner resten. Lektioner varannan vecka står tydligt i rutan."],
  ["Ert alldeles egna schema", "Välj stil, sätt barnets namn överst och lägg till små symboler som hjälper den som inte läser än."],
];

// What a school's printout does, and what this app does instead — shown against
// a real one: the photograph beside this list is the same week as the sample
// sheet at the top of the page, as the school printed it. Each entry is pinned
// to the place on that sheet it talks about, so the list is a caption for a
// picture rather than a set of claims to take on trust.
//
// The copy is plain and practical on purpose: say what is hard to read and
// what happens here instead, not what is wrong with the school's sheet. The
// reader did not make that sheet and cannot change it.
//
// `at` is the pin's position on public/solglantan.webp, in percent of its
// width and height. It is set beside the thing rather than on it, so the
// fault stays visible under its number.
type Fault = { term: string; body: React.ReactNode; at: [number, number] };

const FAULTS: Fault[] = [
  {
    term: "Koder i stället för ord",
    // Subjects as well as teachers. The examples are Friday's TK with MTP,
    // which the sample above prints as Teknik and Mattias. "Vanliga
    // ämneskoder", not all of them: SO and NO are left as codes on purpose
    // (see KNOWN_SUBJECTS).
    //
    // The pin is under Monday's "IDH VSL Sporthallen" rather than at Friday's
    // TK: that box is too narrow to hold a pin without covering the code it
    // points at, and IDH VSL is the same fault with grey space beneath it.
    body: (
      <>
        TK? MTP? Inte helt självklart en stressig tisdagsmorgon. Vanliga ämnen får sina riktiga
        namn direkt, som <strong>Teknik</strong>, och lärarnas namn, som
        <strong> Mattias</strong>, skriver du in en gång.
      </>
    ),
    at: [18.9, 73.2],
  },
  {
    // The pin sits in the grey below the day: the hours the axis prints and
    // the school day never uses. If the grey fill itself is ever mentioned
    // again, it has been measured — low-saturation, mid-lightness pixels in the
    // photo's day columns, 06:00 to 17:30, came to 59.1%.
    term: "Mer plats för själva dagen",
    body: "Originalet visar tider från 06:00 till 17:30, fast skoldagen är mycket kortare. Här följer schemat skoldagen, så lektionerna får gott om plats att synas.",
    at: [49.7, 82.8],
  },
  {
    term: "Ämnet syns först",
    body: "När allt står i samma lilla text får man leta. Här är ämnet störst, och tid, lärare och sal står i mindre text bredvid.",
    at: [64.5, 74.1],
  },
  {
    term: "Färger som hjälper",
    body: "Starka färger kan göra texten svår att läsa. Här får varje ämne en mjuk färg, och texten anpassar sig så att den alltid syns.",
    at: [48.8, 47.3],
  },
  {
    term: "Tiden på ett ställe",
    body: "Små klockslag utspridda längs kanterna blir en tydlig start- och sluttid inne i varje ruta.",
    at: [20.3, 45.0],
  },
  {
    // Not "rasten syns inte": on this sheet it does — white on the grey.
    // Lunch is the one that hides, as a box among the lessons.
    term: "Lunchen syns",
    body: "I originalet ser lunchen nästan ut som en lektion. Här får rast och lunch en egen stil – med kniv och gaffel – så dagens pauser är lätta att hitta.",
    at: [36.8, 60.0],
  },
];

// A second sheet, for what the first one doesn't do. Only faults that are new
// here: this one is grey and full of codes too, but ① and ② already say so,
// and saying it twice would make the list longer without making it truer.
const MORE_FAULTS: Fault[] = [
  {
    term: "Rätt språk, inte fem",
    body: "Fem språkgrupper i samma lilla ruta. Välj den ditt barn går i, så döljs resten – och du kan ändra dig när du vill.",
    at: [19.8, 24.2],
  },
  {
    // Offers both rather than calling a colourless sheet wrong: ink-saving is
    // colourless too, and it is a reasonable thing to want.
    term: "Färg eller svartvitt – ni väljer",
    body: "En färg per ämne gör det lätt att följa matten genom veckan. Vill du spara bläck? Slå på bläcksnål utskrift – allt viktigt står kvar.",
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
      "Samma vecka som exemplet högst upp – så här kom den hem från skolan. (Skola och lärare är anonymiserade.)",
    faults: FAULTS,
  },
  {
    src: "/manskensskolan.webp",
    size: [900, 994],
    alt: "Foto av ett utskrivet högstadieschema för klass 7B, helt i svartvitt: vita lektionsrutor på grå botten, förkortningar som NO, HeLo och Sl tx, och en måndagsruta med fem språkval i mycket liten text.",
    caption: "Ett högstadieschema från en annan skola. (Skola och lärare är anonymiserade.)",
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
  illustration,
  onIllustration,
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
  illustration: boolean;
  onIllustration: (on: boolean) => void;
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
      ? "Vi läser av dagar, tider och lektioner – det brukar gå på en liten stund."
      // Measured, not guessed: a photographed 7A högstadieschema with 43
      // lessons took 36 seconds. "Half a minute" was already wrong for it.
      : "Ett späckat schema tar lite längre tid. Oftast är det klart inom en minut.";

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
        <LogoMark size={30} />
        <span className="wordmark">{SITE_NAME}</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h1>Ett skolschema som barnen faktiskt kan läsa</h1>
          <p className="lead">
            Fota schemat som kom hem från skolan. Efter några minuter har du ett tydligt,
            färgglatt schema med riktiga namn i stället för koder – redo för kylskåpet.
          </p>

          <div className="upload-panel">
            {/* The whole job, before it starts: this is step one of three. */}
            <Stepper current={1} />
            <h2>Börja här</h2>
            <p className="upload-hint">Ett vanligt mobilfoto funkar fint – lite snett är helt okej.</p>
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
                    {/* Not "Förminskar bilden": the step does shrink the photo
                        before it is sent, but on a page about printing a
                        schedule, "shrinking" reads as the schedule coming out
                        smaller. The step is preparation; the label says so. */}
                    {phase === "shrink" ? "Förbereder bilden" : "Läser av schemat"}
                  </>
                ) : (
                  "Ladda upp schemat"
                )}
              </label>
              <p className="or" role="status">
                {working ? (
                  waiting
                ) : (
                  <>
                    <span className="on-mouse">
                      …eller dra in bilden hit. Har du en skärmbild? Klistra in med <kbd>Ctrl</kbd> + <kbd>V</kbd>
                    </span>
                    <span className="on-touch">Fota schemat direkt eller välj en bild du redan har.</span>
                  </>
                )}
              </p>
            </div>

            {!typing ? (
              <button className="linky" onClick={() => setTyping(true)}>
                Har du schemat som text? Klistra in det här →
              </button>
            ) : (
              <div className="typein">
                <label htmlFor="paste">Klistra in eller skriv av schemat</label>
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
                    Läs av schemat
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
          <p className="fineprint">Gratis och utan konto. Schemat läses av med AI hos Google och sparas inte hos oss.</p>
        </div>

        {/* The label is visible text inside the figure, so it is the figure's
            accessible name already. An aria-label on top of it made a screen
            reader read the same sentence twice. */}
        <figure className="hero-sheet">
          {/* The style is applied to this figure, so the swatches below change
              the actual sheet rather than a picture of one — and the choice is
              lifted to the app, so it is still yours after you upload. */}
          <p className="preview-label">Så här kan ert schema se ut</p>
          <div className="paper" data-theme={theme || undefined} data-ink={ink ? "save" : undefined}>
            <FitToWidth>
              <ScheduleSheet
                schedule={SAMPLE_SCHEDULE}
                glossary={SAMPLE_GLOSSARY}
                icons={icons}
                theme={theme}
                illustration={illustration}
              />
            </FitToWidth>
          </div>

          <div className="style-panel">
            <h2>Hitta er stil</h2>
            <p className="style-intro">Klicka runt och prova på exemplet – det du väljer följer med till ert eget schema.</p>
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
              <Check label="Bläcksnål utskrift" hint="svart på vitt – snällt mot skrivaren" on={ink} onChange={onInk} />
              <Check label="Ämnessymboler" hint="små bilder för den som inte läser än" on={icons} onChange={onIcons} />
              <Check
                label="Illustration"
                hint="en liten bild som passar stilen"
                on={illustration}
                onChange={onIllustration}
              />
            </div>
            <p className="style-note" aria-live="polite">
              {ink
                ? "Svart på vitt utan färgfyllningar – snällt mot bläckpatronen. Typsnittet är kvar."
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
        <h2 id="benefits-heading">Gjort för stressiga morgnar</h2>
        <p className="lead">
          När alla ska ut genom dörren samtidigt ska ingen behöva tolka koder. Så här hjälper
          schemat hela familjen att ha koll på veckan.
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
        {/* About the printout, not the reader. An earlier heading said "arket
            du fått hem", which pointed at their own child's sheet — something
            they did not choose and cannot help. */}
        <h2 id="pitfalls-heading">Känner du igen det här?</h2>
        <p className="lead">
          Så här ser många scheman ut när de kommer hem: koder, grått och pyttesmå siffror. Och
          så här fixar vi det. (AI:n läser bra, men kolla gärna tiderna mot originalet.)
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
        <h2>Ert schema stannar hos er</h2>
        <p>
          Inget konto och ingen inloggning. Bilden eller texten läses av med AI hos Google, och vi
          sparar varken den eller ert schema. Schemat sparas bara här i webbläsaren – använd samma
          webbläsare om du vill fortsätta senare. (Rensar du webbläsarens data försvinner det.)
        </p>
        <p>
          Flera barn? Skriv ut det första schemat, tryck på Börja om och ta nästa.
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
