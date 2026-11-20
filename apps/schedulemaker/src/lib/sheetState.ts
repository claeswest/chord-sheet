// Everything that decides what a printed sheet looks like, as one value.
//
// It is what the browser keeps in localStorage, and — since "Skapa PDF" became
// a real print on the server — also what is sent there to be printed. Two
// places now have to agree on its shape, so it lives here rather than inside
// the page that first needed it.

import { normalizeGlossary, type Glossary } from "@/lib/glossary";
import { THEMES } from "@/lib/themes";
import type { Day, Lesson, Schedule, Week } from "@/types/schedule";

/** Paper the sheet is laid out for. A3 is the same document, printed larger. */
export const PAPERS = [
  { id: "a4-landscape", name: "A4 liggande", css: "A4 landscape", w: "297mm", h: "210mm" },
  { id: "a4-portrait", name: "A4 stående", css: "A4 portrait", w: "210mm", h: "297mm" },
  { id: "a3-landscape", name: "A3 liggande", css: "A3 landscape", w: "420mm", h: "297mm" },
  { id: "a3-portrait", name: "A3 stående", css: "A3 portrait", w: "297mm", h: "420mm" },
];

export function paperOf(id: string | undefined) {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[0];
}

export type SheetState = {
  schedule: Schedule;
  glossary: Glossary;
  theme: string;
  paper: string;
  ink: boolean;
  icons: boolean;
  illustration: boolean;
};

// ── Checking a state that came from somewhere else ──────────────────────
//
// The server prints whatever it is sent, in a browser of its own, so what it
// is sent is checked as if a stranger wrote it: the right shape, nothing
// oversized, and nothing the sheet's code would trip on. The limits are far
// above any real timetable (a full upper-secondary week is some 45 lessons)
// and far below what would keep a browser busy.

const MAX_WEEKS = 4;
const MAX_DAYS = 10;
const MAX_LESSONS_PER_DAY = 60;
const MAX_NOTES = 30;
const MAX_TEXT = 500;
const MAX_GLOSSARY = 400;

function text(v: unknown, max = MAX_TEXT): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function optional(v: unknown): string | undefined {
  const s = text(v);
  return s === "" ? undefined : s;
}

function list(v: unknown, max: number): unknown[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  return v;
}

/**
 * A code the glossary can be asked about without surprises.
 *
 * The glossary is plain objects looked up by subject and teacher code, and a
 * plain object answers to "constructor" whether or not anyone put it there.
 * No school has a subject by that name; a state that claims one is refused.
 */
function safeKey(k: string): boolean {
  return !(k in Object.prototype);
}

function map(v: unknown, ok: (value: string) => boolean = () => true): Record<string, string> | null {
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length > MAX_GLOSSARY) return null;
  const out: Record<string, string> = {};
  for (const [k, val] of entries) {
    if (!safeKey(k) || typeof val !== "string") continue;
    const s = val.slice(0, 200);
    if (ok(s)) out[k.slice(0, 100)] = s;
  }
  return out;
}

/** The state, cleaned — or null if it is not one. */
export function cleanState(input: unknown): SheetState | null {
  if (!input || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;
  const s = i.schedule as Record<string, unknown> | undefined;
  if (!s || typeof s !== "object") return null;

  const rawWeeks = list(s.weeks, MAX_WEEKS);
  const rawNotes = list(s.notes ?? [], MAX_NOTES);
  if (!rawWeeks || rawWeeks.length === 0 || !rawNotes) return null;

  const weeks: Week[] = [];
  for (const [wi, w] of rawWeeks.entries()) {
    const wk = (w ?? {}) as Record<string, unknown>;
    const rawDays = list(wk.days, MAX_DAYS);
    if (!rawDays) return null;
    const days: Day[] = [];
    for (const [di, d] of rawDays.entries()) {
      const day = (d ?? {}) as Record<string, unknown>;
      const rawLessons = list(day.lessons, MAX_LESSONS_PER_DAY);
      if (!rawLessons) return null;
      const lessons: Lesson[] = [];
      for (const [li, l] of rawLessons.entries()) {
        const ls = (l ?? {}) as Record<string, unknown>;
        const subject = text(ls.subject);
        const teacher = optional(ls.teacher);
        // Both are looked up in the glossary, the teacher one name at a time.
        const keys = [subject.trim(), ...(teacher ?? "").split(/[,/]/).map((t) => t.trim())];
        if (!keys.every(safeKey)) return null;
        lessons.push({
          // Only ever used as a React key and to tell lessons apart.
          id: text(ls.id, 40) || `l${wi}-${di}-${li}`,
          start: text(ls.start, 40),
          end: text(ls.end, 40),
          subject,
          teacher,
          room: optional(ls.room),
          note: optional(ls.note),
          resolved: ls.resolved === true ? true : undefined,
          hidden: ls.hidden === true ? true : undefined,
        });
      }
      days.push({ id: text(day.id, 40) || `d${wi}-${di}`, name: text(day.name), lessons });
    }
    weeks.push({ id: text(wk.id, 40) || `w${wi}`, label: text(wk.label), days });
  }

  const g = (i.glossary ?? {}) as Record<string, unknown>;
  const teachers = map(g.teachers);
  const subjects = map(g.subjects);
  // A colour ends up in a style attribute: six hex digits, or blank for none.
  const colors = map(g.colors, (c) => c === "" || /^#[0-9a-f]{6}$/i.test(c));
  if (!teachers || !subjects || !colors) return null;

  const theme = typeof i.theme === "string" && THEMES.some((t) => t.id === i.theme) ? i.theme : "";

  return {
    schedule: {
      // undefined is "never set" and gets the default banner; "" is "removed
      // on purpose" and prints none. Both have to survive the trip.
      heading: typeof s.heading === "string" ? text(s.heading) : undefined,
      title: text(s.title),
      subtitle: optional(s.subtitle) ?? null,
      weeks,
      notes: rawNotes.map((n) => text(n)),
    },
    glossary: normalizeGlossary({ teachers, subjects, colors }),
    theme,
    paper: paperOf(typeof i.paper === "string" ? i.paper : undefined).id,
    ink: i.ink === true,
    icons: i.icons !== false,
    illustration: i.illustration !== false,
  };
}
