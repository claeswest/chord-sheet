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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { compressImage } from "@clavos/core/image";
import ScheduleSheet from "@/components/ScheduleSheet";
import FitToWidth from "@/components/FitToWidth";
import GlossaryPanel from "@/components/GlossaryPanel";
import LessonEditor from "@/components/LessonEditor";
import PrintFit from "@/components/PrintFit";
import Check from "@/components/Check";
import Stepper from "@/components/Stepper";
import { LockIcon, PdfIcon, PrintIcon, RestartIcon, SaveIcon, ShareIcon } from "@/components/UiIcon";
import SharePanel from "@/components/SharePanel";
import SiteHeader, { scheduleName, type Account } from "@/components/SiteHeader";
import ChoicesPanel, { type Decision } from "@/components/ChoicesPanel";
import Landing from "@/components/Landing";
import {
  EMPTY_GLOSSARY,
  codesIn,
  normalizeGlossary,
  withDefaultColors,
  withKnownNames,
  type Glossary,
} from "@/lib/glossary";
import { ShareError, sharedIn, unpackSchedule } from "@/lib/share";
import { pdfName, saveFile, sheetPdf } from "@/lib/sheetPdf";
import { PAPERS, SHEET_STORE, paperOf, type SheetState, type StoredSheet } from "@/lib/sheetState";
import { THEMES, type Theme } from "@/lib/themes";
import { unresolvedChoices, type Lesson, type Schedule } from "@/types/schedule";

const STORE = SHEET_STORE;

/**
 * Whether "Skapa PDF" has the server print the sheet (a vector PDF) or draws
 * a picture of it here in the browser.
 *
 * On since 20 Nov 2026. It shipped off for an hour first: the route works on
 * a laptop with the Chrome and the fonts that are installed there, and on the
 * host it runs a different browser with one font in it, which could only be
 * looked at once it was there. It was, in all eight styles, and it was right.
 *
 * Setting this to false is the way to go back to the picture for everyone —
 * if the host changes something, or the bill for running browsers does. The
 * sentence on the front page about a schedule being sent to the server when a
 * PDF is made belongs to this switch, and goes when it goes.
 */
const PRINT_ON_SERVER = true;

/** How long to wait for the server's PDF before drawing one here instead. */
const SERVER_PDF_WAIT_MS = 30_000;

type Stored = StoredSheet;

/**
 * The photograph a schedule was just read from, on its way from the start page
 * to the editor.
 *
 * The editor shows it beside the sheet for checking against. It is deliberately
 * never written to storage — it is a picture of a child's timetable — so it
 * cannot travel the way the schedule does. It waits here instead: a value in
 * this module survives going from one page of the app to the next, and is gone
 * the moment the tab is reloaded or closed, which is exactly as long as it
 * should last.
 */
let heldSource: string | null = null;

const BROKEN_LINK = "Den här länken gick inte att läsa. Be om en ny – den kan ha kortats av på vägen.";

/**
 * What a fresh start looks like. One place, read both when the page first loads
 * and when "Börja om" is confirmed — they used to be written out twice, and
 * "Börja om" only knew about half of them: the style, paper and switches
 * survived it, so starting over kept Skymning until the page was reloaded.
 */
const DEFAULTS = {
  theme: "",
  paper: "a4-landscape",
  ink: false,
  icons: true,
  illustration: true,
} as const;

/**
 * The app, as one of its two pages.
 *
 * "start" is the front page: what this is, and where a schedule is uploaded.
 * "editor" is the schedule itself: steps two and three. They were one address
 * until 22 Nov 2026 — the front page was simply what showed when no schedule
 * existed — which meant that anyone with a schedule could never see the front
 * page again without throwing the schedule away.
 *
 * They are still one component, because they share nearly everything they
 * know: the schedule in this browser, the style chosen for it, who is signed
 * in. What carries a schedule from one page to the other is the same thing
 * that carries it across a reload: this browser's storage.
 */
export default function SchedulerApp({ view }: { view: "start" | "editor" }) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [glossary, setGlossary] = useState<Glossary>(EMPTY_GLOSSARY);
  const [theme, setTheme] = useState<string>(DEFAULTS.theme);
  const [paper, setPaper] = useState<string>(DEFAULTS.paper);
  /** Print without fills, whatever the style. A fact about the printer. */
  const [ink, setInk] = useState<boolean>(DEFAULTS.ink);
  /** Little subject drawings. Fun, and findable by a child who cannot read yet. */
  const [icons, setIcons] = useState<boolean>(DEFAULTS.icons);
  const [illustration, setIllustration] = useState<boolean>(DEFAULTS.illustration);
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
  /** The dialog that makes a link for the class. See lib/share.ts. */
  const [sharing, setSharing] = useState(false);
  /** A PDF is being drawn. It takes a second or two, and a second press would start another. */
  const [makingPdf, setMakingPdf] = useState(false);
  // A schedule that arrived in a link while this browser already holds one.
  // There is room for one schedule here, so opening the link would replace an
  // afternoon of somebody's work — it waits for an answer instead.
  const [incoming, setIncoming] = useState<{ schedule: Schedule; glossary: Glossary } | null>(null);
  /** The schedule on screen came from a link, and its reader hasn't been told what to do with it yet. */
  const [fromLink, setFromLink] = useState(false);
  // What the link handler needs to know when it runs, which is later than when
  // it was set up: whether there is already a schedule here.
  const scheduleRef = useRef<Schedule | null>(null);
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  // ── Accounts ──────────────────────────────────────────────────────────
  // Optional, and invisible on a site that has none: until /api/me says there
  // are accounts here, nothing below draws anything.
  const [account, setAccount] = useState<Account | null>(null);
  /** Which saved schedule the one on screen is. See StoredSheet.savedId. */
  const [savedId, setSavedId] = useState<string | undefined>(undefined);
  /** The sheet as it was when it was last saved, to know whether it has changed since. */
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** The Plus style someone on Gratis has just pressed, while the note about it is open. */
  const [plusStyle, setPlusStyle] = useState<Theme | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then(
        (d) =>
          live &&
          setAccount({ enabled: Boolean(d.enabled), email: d.user?.email ?? null, plan: d.user?.plan }),
      )
      .catch(() => live && setAccount({ enabled: false, email: null }));
    return () => {
      live = false;
    };
  }, []);

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
          const restored: SheetState = {
            schedule: s.schedule,
            glossary: withDefaultColors(withKnownNames(normalizeGlossary(s.glossary), subjects), subjects),
            // "plain" was the ink-saving style before it became a switch.
            // Restoring it as a style id would leave the setting silently off.
            theme: s.theme === "plain" ? DEFAULTS.theme : s.theme ?? DEFAULTS.theme,
            paper: s.paper ?? DEFAULTS.paper,
            ink: s.ink ?? s.theme === "plain",
            icons: s.icons ?? DEFAULTS.icons,
            illustration: s.illustration ?? DEFAULTS.illustration,
          };
          setGlossary(restored.glossary);
          setTheme(restored.theme);
          setInk(restored.ink);
          setIcons(restored.icons);
          setIllustration(restored.illustration);
          setPaper(restored.paper);
          const id = typeof s.savedId === "string" ? s.savedId : undefined;
          setSavedId(id);
          // A saved schedule that has not been touched since is, as it stands
          // now, the saved version. One marked dirty is not: it used to be
          // taken for saved all the same, so a reload turned unsaved changes
          // into "Sparat". The keys are in the order sheetNow writes them —
          // the two strings are compared.
          if (id && !s.dirty) setSavedAs(JSON.stringify(restored));
        }
      }
    } catch {
      /* private mode, or a shape from an older version — start fresh */
    }
    setLoaded(true);
  }, []);

  /** Everything a save sends, as text — also what "has it changed since?" compares. */
  const sheetNow = schedule
    ? JSON.stringify({ schedule, glossary, theme, paper, ink, icons, illustration } satisfies SheetState)
    : null;
  const unsaved = sheetNow !== null && sheetNow !== savedAs;

  useEffect(() => {
    if (!loaded) return;
    try {
      if (schedule)
        localStorage.setItem(
          STORE,
          JSON.stringify({
            schedule,
            glossary,
            theme,
            paper,
            ink,
            icons,
            illustration,
            savedId,
            dirty: savedId ? unsaved : undefined,
          } satisfies Stored),
        );
      else localStorage.removeItem(STORE);
    } catch {
      /* a full or disabled store just means edits don't survive a reload */
    }
  }, [loaded, schedule, glossary, theme, paper, ink, icons, illustration, savedId, unsaved]);
  /**
   * The open schedule exists nowhere but in this browser, in whole or in part:
   * nobody is signed in, or it was never saved, or it has changed since.
   */
  const openOnlyHere = !account?.email || !savedId || unsaved;

  /**
   * Keep this schedule in the account.
   *
   * Signed out, this is the way in: the schedule stays in the browser while
   * its owner signs in, and the address they come back to (/?spara=1) saves
   * it without their having to ask again. Signed in, it updates the saved
   * schedule this one came from, or makes a new one.
   */
  async function save() {
    if (!schedule || !sheetNow || saving) return;
    if (!account?.email) {
      window.location.href = "/login?next=save";
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const send = (url: string, method: string) =>
        fetch(url, { method, headers: { "Content-Type": "application/json" }, body: sheetNow });
      let res = savedId ? await send(`/api/schedules/${savedId}`, "PUT") : await send("/api/schedules", "POST");
      // Saved once, then deleted from "Mina scheman" in another tab: it is
      // still wanted, or nobody would be pressing Spara. Make it again.
      if (savedId && res.status === 404) res = await send("/api/schedules", "POST");
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login?next=save";
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Det gick inte att spara. Försök igen.");
        return;
      }
      if (data.schedule?.id) setSavedId(data.schedule.id);
      setSavedAs(sheetNow);
    } catch {
      setError("Vi når inte fram just nu. Schemat finns kvar här i webbläsaren – försök spara igen om en stund.");
    } finally {
      setSaving(false);
    }
  }

  // Once, when both the stored schedule and the sign-in are known. Whether
  // the schedule is saved was settled as it was read from storage; what waits
  // for the sign-in is saying so, and the save that a return from the login
  // page asks for.
  const baselined = useRef(false);
  /** True once it is known whether the open schedule is saved. Until then, nothing claims either way. */
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!loaded || !account || baselined.current) return;
    baselined.current = true;
    setSettled(true);
    // Back from signing in with a schedule waiting to be saved.
    if (view === "editor" && new URLSearchParams(window.location.search).get("spara") === "1") {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      if (account.email && schedule) save();
    }
    // Runs once by design; save and sheetNow are read as they are at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, account]);

  /**
   * Take the schedule out of the address once it has been dealt with.
   *
   * Left there, a reload would ask the same question again, and a class's
   * timetable would sit in the address bar and the history for no reason.
   */
  function clearLink() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  /**
   * The finished sheet as a file, straight to the downloads.
   *
   * Printed for real: the schedule goes to /api/pdf, where a browser on the
   * server opens it and saves it as a PDF, the way "Skriv ut" followed by
   * "Spara som PDF" would. That file is vector — text is text, sharp at any
   * size — which a picture of the sheet never is.
   *
   * The picture is still here, as what happens when the server cannot: no
   * connection, a browser that would not start, too many in a row. A PDF that
   * is slightly less sharp beats a button that sometimes does nothing.
   */
  async function makePdf() {
    if (!schedule || makingPdf) return;
    const size = paperOf(paper);
    setMakingPdf(true);
    setError(null);
    try {
      let blob: Blob | null = null;
      if (PRINT_ON_SERVER) {
        try {
          const state: SheetState = { schedule, glossary, theme, paper, ink, icons, illustration };
          const res = await fetch("/api/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state),
            signal: AbortSignal.timeout(SERVER_PDF_WAIT_MS),
          });
          const got = res.ok ? await res.blob() : null;
          if (got && got.type === "application/pdf" && got.size > 1000) blob = got;
          else console.warn("[pdf] the server gave no PDF, drawing one here instead", res.status);
        } catch (e) {
          console.warn("[pdf] the server could not be reached, drawing one here instead", e);
        }
      }
      blob ??= await sheetPdf({ wMm: parseInt(size.w, 10), hMm: parseInt(size.h, 10) });
      saveFile(blob, pdfName(schedule.heading, schedule.title));
    } catch (e) {
      console.error("[pdf]", e);
      // The dialog's own PDF is made by the browser, not by this page, so it
      // still works when this does not — and it says where to find it.
      setError(
        "Det gick inte att skapa en PDF här. Tryck på Skriv ut och välj ”Spara som PDF” i stället.",
      );
    } finally {
      setMakingPdf(false);
    }
  }

  /** Make a schedule from a link the one this browser holds. */
  function adopt(got: { schedule: Schedule; glossary: Glossary }) {
    setSchedule(got.schedule);
    setGlossary(got.glossary);
    // Whatever photograph was in memory belonged to the schedule this replaces.
    setSource(null);
    // Step two: the link deliberately arrives without a name or any choices
    // made, and those are what this step is for. The style, paper and switches
    // are left as this reader had them — they were never the sender's to set.
    setMode("edit");
    setOpenLesson(null);
    setError(null);
    setIncoming(null);
    setFromLink(true);
    // Somebody else's schedule, newly arrived: not any saved one of ours.
    setSavedId(undefined);
    setSavedAs(null);
    clearLink();
    window.scrollTo({ top: 0 });
  }

  // A schedule in the address: someone was sent a link. Waits for the stored
  // schedule to be read first, because what happens next depends on whether
  // there is one. Listens for the address changing as well — pasting a link
  // into a tab that already has this page open changes the # without loading
  // anything.
  useEffect(() => {
    if (!loaded) return;
    let live = true;
    async function check() {
      const payload = sharedIn(window.location.hash);
      if (!payload) return;
      // Links made before the editor had its own address point at the start
      // page, and they are out there in class chats. Pass them on, whole.
      if (view === "start") {
        router.replace("/schema" + window.location.hash);
        return;
      }
      try {
        const got = await unpackSchedule(payload);
        if (!live) return;
        if (scheduleRef.current) {
          // One question at a time: the link dialog may be open underneath.
          setSharing(false);
          setError(null);
          setIncoming(got);
        } else adopt(got);
      } catch (e) {
        if (!live) return;
        clearLink();
        // With a schedule open, say so here and leave it alone. With none,
        // the editor has nothing to show: the start page says it instead.
        if (scheduleRef.current) setError(e instanceof ShareError ? e.message : BROKEN_LINK);
        else router.replace("/?fel=lank");
      }
    }
    check();
    window.addEventListener("hashchange", check);
    return () => {
      live = false;
      window.removeEventListener("hashchange", check);
    };
    // adopt and clearLink only call setters, so there is nothing stale to capture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, view]);

  // The editor with no schedule is an empty page. That is what "Börja om"
  // leaves behind, and what anyone gets who opens /schema in a browser that
  // has none — both belong on the start page. A link still waiting in the
  // address is left for the handler above to deal with.
  useEffect(() => {
    if (view !== "editor" || !loaded || schedule || incoming) return;
    if (sharedIn(window.location.hash)) return;
    router.replace("/");
  }, [view, loaded, schedule, incoming, router]);

  // Arriving at the editor straight from a read: pick up the photograph.
  // Arriving at the start page from a link that could not be read: say so.
  useEffect(() => {
    if (view === "editor") {
      if (heldSource) setSource(heldSource);
      heldSource = null;
      return;
    }
    const q = new URLSearchParams(window.location.search);
    if (q.get("fel") === "lank") {
      setError(BROKEN_LINK);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [view]);

  async function read(payload: { image?: string; text?: string }) {
    setBusy(true);
    setPhase("read");
    setError(null);
    // Once the editor is on its way, the start page should go on saying
    // "reading" until it is replaced, not flash back to its upload button.
    let leaving = false;
    try {
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Något gick snett. Försök igen.");
        return;
      }
      setSchedule(data.schedule);
      setFromLink(false);
      // A fresh read is a new schedule, not a new version of a saved one.
      setSavedId(undefined);
      setSavedAs(null);
      // Colours and the names we're sure of up front, so the sheet arrives
      // looking like something and already half in words.
      const read = codesIn(data.schedule).subjects;
      const named = withDefaultColors(withKnownNames(EMPTY_GLOSSARY, read), read);
      setGlossary(named);
      if (view === "start") {
        // Written here and now, not left to the effect that normally keeps
        // storage up to date: the editor reads storage as it opens, and that
        // must not be a race with this page's next render. No savedId — this
        // is a new schedule, whatever was open before.
        try {
          localStorage.setItem(
            STORE,
            JSON.stringify({ schedule: data.schedule, glossary: named, theme, paper, ink, icons, illustration }),
          );
        } catch {
          /* no storage: the editor will find nothing and send them back here */
        }
        leaving = true;
        router.push("/schema");
      }
    } catch {
      setError("Vi når inte fram just nu. Kolla internetuppkopplingen och försök igen.");
    } finally {
      if (!leaving) {
        setBusy(false);
        setPhase(null);
      }
    }
  }

  // ── Replacing a schedule from the start page ─────────────────────────
  // The start page can now be reached with a schedule open, and uploading
  // there makes a new one. If the open one is not safely saved, that is the
  // same loss "Börja om" asks about — so this asks too, and holds the upload
  // until it is answered.
  const [pendingRead, setPendingRead] = useState<null | { run: () => void }>(null);
  function guarded(run: () => void) {
    const atRisk = schedule !== null && (!savedId || unsaved);
    if (atRisk) setPendingRead({ run });
    else run();
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
      heldSource = small;
      await read({ image: small });
    } catch {
      setError("Den bilden gick inte att öppna. Prova ett vanligt foto eller en skärmbild (JPG eller PNG).");
      setPhase(null);
    }
  }

  /**
   * Everything back to how a first visit finds it — not just the schedule.
   * What someone confirms with "Ja, ta bort" is starting over, and a front page
   * still in last time's style, or still showing last time's error, is not
   * that. The front page's own state (the text box) resets by itself: it is
   * unmounted while a schedule is open.
   */
  function startOver() {
    setSchedule(null);
    setSource(null);
    setGlossary(EMPTY_GLOSSARY);
    setTheme(DEFAULTS.theme);
    setPaper(DEFAULTS.paper);
    setInk(DEFAULTS.ink);
    setIcons(DEFAULTS.icons);
    setIllustration(DEFAULTS.illustration);
    setMode("edit");
    setOpenLesson(null);
    setError(null);
    setFit(1);
    pendingSlotStart.current = null;
    setResetting(false);
    setSharing(false);
    setIncoming(null);
    setFromLink(false);
    // Starting over lets go of the saved schedule; it does not delete it.
    // That is what "Mina scheman" is for.
    setSavedId(undefined);
    setSavedAs(null);
    // The front page starts at its top, not wherever the editor was scrolled.
    window.scrollTo({ top: 0 });
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

  /**
   * Several slots decided at once, in one change.
   *
   * The choices panel answers a question for every slot that asks it — Monday's
   * language block and Wednesday's together. pickOption can't be called twice
   * in a row for that: both calls start from the same schedule, and the second
   * writes over the first.
   */
  function decide(decisions: Decision[]) {
    if (!schedule || decisions.length === 0) return;
    setSchedule({
      ...schedule,
      weeks: schedule.weeks.map((w) => ({
        ...w,
        days: w.days.map((d) => {
          const mine = decisions.filter((x) => x.weekId === w.id && x.dayId === d.id);
          if (mine.length === 0) return d;
          return {
            ...d,
            lessons: d.lessons.map((l) => {
              const hit = mine.find((x) => x.start !== "" && x.start === l.start);
              if (!hit) return l;
              return { ...l, resolved: true, hidden: hit.keepId ? l.id !== hit.keepId : false };
            }),
          };
        }),
      })),
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

  const sheetPaper = paperOf(paper);
  const openChoices = schedule ? unresolvedChoices(schedule) : 0;

  // The style belongs to the sheet, not the page. It used to be set up here
  // once a schedule existed, and everything in the app that reads the style's
  // variables took its colours: on Skymning the editor's hint lines came out
  // lilac on light grey, a colour meant for dark paper. It is set on a box
  // around the sheet now, as the front page already did for its preview.
  return (
    <main className={view === "editor" && schedule ? "app has-bar" : "app"}>
      <SiteHeader current={view} account={account} />
      {/* @page can't be set from a class, so the chosen size is injected.
          Without it the browser prints A4 whatever the sheet is laid out for,
          and an A3 schedule comes out cropped. */}
      <style>{`@page { size: ${sheetPaper.css}; margin: 0; }
        .sheet { width: ${sheetPaper.w}; min-height: ${sheetPaper.h}; }`}</style>
      {view === "start" && schedule && settled && openOnlyHere && !pendingRead && !busy && phase === null && (
        // The way back to a schedule that cannot be reached any other way.
        //
        // Shown only then. Signed in, with the open schedule saved and
        // unchanged, it is in "Mina scheman" and that is where one goes for
        // it — a strip saying it is open told a signed-in person nothing. It
        // is for the visitor with no account, whose one schedule lives in this
        // browser, and for anyone whose open schedule holds work that is not
        // saved: without this, that work would be a page nobody links to.
        //
        // Earlier wordings said more than was true or needed: "på gång" read
        // as a status report, and "finns kvar" stated the obvious.
        <div className="notice no-print" role="status">
          <p>
            <strong>{scheduleName(schedule) || "Ett schema"}</strong>{" "}
            {!account?.email
              ? "är öppet."
              : savedId
                ? "har ändringar som inte är sparade."
                : "är öppet men inte sparat."}
          </p>
          <Link href="/schema" className="btn primary">
            Gå till schemat →
          </Link>
        </div>
      )}

      {view === "start" && pendingRead && (
        <div className="notice no-print" role="alertdialog" aria-label="Ersätta schemat?">
          <p>
            <strong>Du har redan ett schema öppet som inte är sparat.</strong> Ett nytt ersätter
            det.
          </p>
          <span className="confirm">
            <button
              className="danger"
              onClick={() => {
                const { run } = pendingRead;
                setPendingRead(null);
                run();
              }}
            >
              Ja, ersätt
            </button>
            <button className="quiet" onClick={() => setPendingRead(null)}>
              Avbryt
            </button>
          </span>
        </div>
      )}

      {view === "start" && (
        <Landing
          busy={busy}
          phase={phase}
          error={error}
          onPhoto={(file) => guarded(() => pickPhoto(file))}
          onText={(t) => guarded(() => read({ text: t }))}
          theme={theme}
          onTheme={setTheme}
          ink={ink}
          onInk={setInk}
          icons={icons}
          onIcons={setIcons}
          illustration={illustration}
          onIllustration={setIllustration}
          accounts={Boolean(account?.enabled)}
        />
      )}

      {view === "editor" && schedule && (
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
            {/* Beside the way out, because it is the other answer to "what
                happens to this schedule?" — and before it, since it is the
                kinder one. Says what state things are in rather than only what
                it does: "Sparat" is information, and a greyed-out "Spara"
                would not be. */}
            {account?.enabled && !resetting && (
              <button
                className="with-icon save"
                onClick={save}
                disabled={saving || (Boolean(account.email) && !unsaved)}
              >
                <SaveIcon />
                {/* Signed out, pressing it leads to the login page. "Spara
                    schemat" did not say so, and a button that opens a sign-in
                    form when you expected a saved file reads as a trap. */}
                {!account.email
                  ? "Spara i ett konto"
                  : saving
                    ? "Sparar…"
                    : unsaved
                      ? savedId
                        ? "Spara ändringar"
                        : "Spara"
                      : "Sparat"}
              </button>
            )}
            {resetting ? (
              <span className="confirm">
                Ta bort det här schemat och börja om?
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
                    {/* The Plus styles are in the row with a lock on them, for
                        anyone not on Plus: a style nobody can see is a style
                        nobody can want. Not on a site without accounts, where
                        there is no Plus to be on. The lock here is a sign on the
                        door; the door itself is withinPlan() on the server. */}
                    {THEMES.filter((t) => !t.plus || account?.enabled).map((t) => {
                      const locked = Boolean(t.plus) && account?.plan !== "plus";
                      return (
                        <button
                          key={t.id}
                          className={locked ? "swatch locked" : "swatch"}
                          style={{ background: t.dot }}
                          aria-label={locked ? `${t.name} – ingår i Plus` : t.name}
                          title={locked ? `${t.name} – ingår i Plus` : t.name}
                          aria-pressed={theme === t.id}
                          onClick={() => (locked ? setPlusStyle(t) : setTheme(t.id))}
                        >
                          {locked && <LockIcon />}
                        </button>
                      );
                    })}
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
                  <Check label="Ämnessymboler" on={icons} onChange={setIcons} />
                  <Check label="Illustration" on={illustration} onChange={setIllustration} />
                  <Check label="Bläcksnål utskrift" on={ink} onChange={setInk} />
                </div>
              </div>
            )}

            <div className="actions">
              {editing ? (
                <>
                  {/* One line, in the row, instead of two stacked under it: the
                      step's instruction when nothing is blocking, and while
                      something is, a pointer to the panel that says what. */}
                  <p className="hint actions-hint actions-hint-lead">
                    {openChoices > 0 ? (
                      "Gör valen här nedanför först – sen är du nästan klar."
                    ) : (
                      <>
                        <span className="on-mouse">Klicka</span>
                        <span className="on-touch">Tryck</span> på det som behöver ändras – en rubrik, en dag
                        eller en lektion. Jämför gärna med originalet, AI:n kan läsa fel ibland.
                      </>
                    )}
                  </p>
                  {/* The one way onwards, and it is refused while a choice is
                      open. Disabling it with a reason beside it beats letting
                      someone print a sheet that offers five languages at once. */}
                  <div className="actions-buttons">
                    <button
                      className="primary onward"
                      onClick={() => setMode("view")}
                      disabled={openChoices > 0}
                    >
                      Nästa: Skriv ut →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Quiet, and gone on a phone: the stepper above already
                      goes back, and this row had six buttons of the same
                      weight. Now there is one that matters most (Skriv ut),
                      two beside it, and the rest step back. */}
                  <button className="quiet back" onClick={() => setMode("edit")}>
                    ← Redigera
                  </button>
                  {/* Between the two buttons it is about, rather than a line of
                      its own under them: the same words, one row less. On a
                      narrow screen there is no room between them, and it wraps
                      to its own line below (see .actions-hint). */}
                  <p className="hint actions-hint">
                    Snyggt! Kolla tiderna en sista gång, sen är det bara att trycka på{" "}
                    <strong>Skriv ut</strong> – eller skapa en PDF.
                  </p>
                  {/* The three things to do with a finished sheet. Sharing is
                      only here, on step three: a link made halfway through
                      naming the teachers hands the class the half that is
                      left. The PDF is a file in one press — the print dialog
                      can save one too, but it is a different dialog in every
                      browser and on a phone most people never find it.

                      The words in .wide are dropped on a phone, where these
                      three share one bar across the bottom of the screen. */}
                  <div className="actions-buttons">
                    <button className="with-icon" onClick={() => setSharing(true)}>
                      <ShareIcon />
                      <span>
                        Dela<span className="wide"> med klassen</span>
                      </span>
                    </button>
                    <button className="with-icon" onClick={makePdf} disabled={makingPdf}>
                      <PdfIcon />
                      {makingPdf ? (
                        "Skapar…"
                      ) : (
                        <span>
                          <span className="wide">Skapa </span>PDF
                        </span>
                      )}
                    </button>
                    <button className="primary onward with-icon" onClick={() => window.print()}>
                      <PrintIcon />
                      Skriv ut
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {!editing && fit < 0.995 && (
            <p className="hint no-print" style={{ marginTop: -8 }}>
              Schemat är lite för långt för en sida, så det krymps till {Math.round(fit * 100)} % när
              du skriver ut – då får allt plats på ett ark.{" "}
              {/* Below three quarters the type is getting genuinely small — a
                  two-week schedule lands around 66% on A4. A3 is the same
                  document on bigger paper and measured 93% for that case, so
                  the promise here is "clearer", not "full size": the first
                  draft of this line said full size and the measurement said
                  otherwise. */}
              {fit < 0.75 && paper.startsWith("a4") && (
                <>
                  På A3 blir texten större – samma schema, större papper.{" "}
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

          {error && <p className="error no-print">{error}</p>}

          {/* Says what is missing on purpose. A schedule from a link has no
              name across the top and every choice open again, and without
              this it just looks unfinished. */}
          {fromLink && editing && (
            <div className="notice no-print" role="status">
              <p>
                {/* "Delat med dig", not "från en annan förälder": it may as
                    well have come from a teacher's link (components/SharedView). */}
                <strong>Det här schemat är delat med dig.</strong>{" "}
                <span className="on-mouse">Klicka</span>
                <span className="on-touch">Tryck</span> på rubriken och skriv ert barns namn, gör era
                egna val och skriv ut. Det sparas bara här i din webbläsare.
              </p>
              <button className="quiet" onClick={() => setFromLink(false)}>
                Okej
              </button>
            </div>
          )}

          {editing && <ChoicesPanel schedule={schedule} glossary={glossary} onDecide={decide} />}

          {/* Side by side while closed — two rows of page for two one-line
              summaries was most of a screen before the sheet on a laptop. An
              open one takes the full width (see .panels). */}
          {editing && (
            <div className={`panels no-print ${source ? "" : "single"}`}>
              <GlossaryPanel schedule={schedule} glossary={glossary} onChange={setGlossary} />
              {source && (
                <details className="panel no-print">
                  <summary>
                    <span className="panel-title">Originalet</span>
                    <span className="hint"> — jämför tider och lektioner</span>
                  </summary>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={source} alt="Det fotograferade schemat" className="source-photo" />
                </details>
              )}
            </div>
          )}

          <PrintFit
            pageHeightMm={parseInt(sheetPaper.h, 10)}
            pageWidthMm={parseInt(sheetPaper.w, 10)}
            deps={`${JSON.stringify(schedule)}|${editing}|${paper}|${theme}|${ink}|${icons}|${illustration}`}
            onFit={setFit}
          />

          <FitToWidth readable scrollHint="Svep åt sidan för att se hela veckan.">
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

          {sharing && (
            <SharePanel
              schedule={schedule}
              glossary={glossary}
              onClose={() => setSharing(false)}
              live={
                account?.enabled
                  ? {
                      plan: account.plan,
                      signedIn: Boolean(account.email),
                      savedId,
                      unsaved,
                      saving,
                      onSave: save,
                    }
                  : undefined
              }
            />
          )}

          {plusStyle && (
            // What a locked style says when pressed. Short, and honest about
            // the one thing that would otherwise disappoint: Plus cannot be
            // bought yet. The page it leads to says the rest.
            <div className="overlay no-print" onClick={() => setPlusStyle(null)}>
              <div
                className="dialog share"
                role="dialog"
                aria-modal="true"
                aria-labelledby="plus-style-title"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="panel-title" id="plus-style-title">
                  <span className="plus-dot" style={{ background: plusStyle.dot }} aria-hidden />
                  {plusStyle.name} ingår i Plus
                </p>
                <p className="share-lead">
                  {plusStyle.note} Plus är för dig som gör scheman åt andra. Det går inte att köpa
                  än, men du kan säga till att du vill ha det.
                </p>
                <div className="controls" style={{ marginTop: 16, marginBottom: 0 }}>
                  <Link href="/plus" className="btn primary">
                    Läs om Plus →
                  </Link>
                  <button onClick={() => setPlusStyle(null)} style={{ marginLeft: "auto" }}>
                    Stäng
                  </button>
                </div>
              </div>
            </div>
          )}

          {incoming && (
            // Closing it any other way than "Öppna" keeps what is here: the
            // cautious answer is the one a stray click should give.
            <div
              className="overlay no-print"
              onClick={() => {
                setIncoming(null);
                clearLink();
              }}
            >
              <div
                className="dialog share"
                role="dialog"
                aria-modal="true"
                aria-labelledby="incoming-title"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="panel-title" id="incoming-title">
                  Öppna det delade schemat?
                </p>
                <p className="share-lead">
                  Länken du öppnade innehåller ett schema
                  {incoming.schedule.title || incoming.schedule.subtitle ? (
                    <>
                      {" "}
                      för{" "}
                      <strong>
                        {[incoming.schedule.title, incoming.schedule.subtitle].filter(Boolean).join(" · ")}
                      </strong>
                    </>
                  ) : null}
                  . Du har redan ett schema här i webbläsaren, och det försvinner om du öppnar det
                  delade.
                </p>
                <div className="controls" style={{ marginTop: 16, marginBottom: 0 }}>
                  <button
                    onClick={() => {
                      setIncoming(null);
                      clearLink();
                    }}
                  >
                    Behåll mitt
                  </button>
                  <button className="danger" onClick={() => adopt(incoming)} style={{ marginLeft: "auto" }}>
                    Öppna det delade
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
