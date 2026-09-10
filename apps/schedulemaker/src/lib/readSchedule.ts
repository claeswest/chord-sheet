// Reading a timetable off a photograph.
//
// The prompt and the validation live together because they are one contract:
// the prompt promises a shape, and nothing below trusts that it kept the
// promise. That split is lifted straight from RecipeBookMaker's importer,
// which earned it — a model asked to extract a recipe from a photo of a
// finished dish will write a confident, plausible, entirely invented one.
//
// The stakes here are higher than a recipe's. A wrong ingredient makes a
// worse dinner. A wrong room sends a nine-year-old to the wrong place.

import type { Day, Lesson, Schedule, Week } from "@/types/schedule";

const uid = () => Math.random().toString(36).slice(2, 10);

export class ReadError extends Error {}

export const READ_PROMPT = `You are given a photograph or scan of a timetable — a school class schedule, a shift rota, a week plan. Transcribe it into JSON.

You are a transcriber, not an author. Every rule below exists because the alternative is a plausible invention that someone will act on.

Rules:
- Output ONLY a JSON object. No markdown fence, no commentary.
- Use the SAME LANGUAGE as the sheet. Do not translate. "Måndag" stays "Måndag", "Idrott" stays "Idrott".
- Transcribe only what is written. Never add a lesson, a teacher, a room or a time that is not on the sheet. If a cell has no teacher, leave teacher out. Do not guess from the subject.
- IF THERE IS NO TIMETABLE IN THE IMAGE — a photo of a person, a building, a letter home, a blank page — return exactly {"error":"no_schedule"} and nothing else. Never reconstruct a plausible school week from what you know about schools. It would look right and be fiction.
- Times exactly as printed: "08:20", not 8.20 or 08:00. If a row spans a period with no clock time ("Pass 1", "Förmiddag"), leave start and end as "" and put the label in subject or note as written.
- SOME SHEETS SHOW TWO GRIDS — "jämna veckor" and "udda veckor", or "Vecka A" and "Vecka B". Return ONE week holding both, like this:
  - A lesson that is THE SAME in both grids — same day, same time, same subject — is ONE lesson, with no note. Most of the week is this. Writing it twice would say a child has two Swedish lessons at nine o'clock.
  - A lesson that DIFFERS between the grids, or appears in only one of them, is kept as its own lesson with the grid's label copied into "note" — "jämna veckor". Two of them at the same time on the same day is correct and expected; it is exactly how a one-grid sheet writes the same thing, with "BL jv" and "SV uv" in a single cell.
  - Never drop a grid and never pick one.
- Days keep the sheet's order and the sheet's names, including a Saturday or a Sunday if there is one.
- A cell holding several things ("Matte, sal 12, AB") splits into subject, room and teacher only where the sheet makes that obvious. Anything you cannot confidently split goes in note, unchanged.
- Repeated free periods, lunch and breaks ARE part of the day: include them as lessons with the subject as written ("Lunch", "Rast").
- notes: real footnotes and reminders outside the grid — "Idrott jämna veckor", "Ta med simsaker". NOT the document's own furniture: the word "SCHEMA" or "Timetable" at the top, a print date, a page number and the school's name are not notes. If there are no footnotes, notes is [].
- title: whose schedule it is — the class or the name only. Drop the field label the sheet prints in front of it: "Klass: 7A" gives title "7A", "Class 3A" gives "3A". If the sheet does not say, use "".
- subtitle: school, term, ward, date range — whatever sits under the title, else null.

Shape:
{
  "title": string,
  "subtitle": string | null,
  "weeks": [
    {
      "label": string,
      "days": [
        {
          "name": string,
          "lessons": [
            { "start": string, "end": string, "subject": string, "teacher": string|null, "room": string|null, "note": string|null }
          ]
        }
      ]
    }
  ],
  "notes": string[]
}

Timetable:
`;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strOrUndefined(v: unknown): string | undefined {
  const s = str(v);
  return s === "" ? undefined : s;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Strips a ```json fence if the model added one despite being told not to. */
export function stripFence(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

/**
 * Normalises a printed time without doing arithmetic on it.
 *
 * "8.20" and "0820" both become "08:20"; anything unrecognised is kept exactly
 * as written, because an unfamiliar format is far more likely to be a real
 * thing on the page than a mistake worth discarding.
 */
function time(v: unknown): string {
  const s = str(v);
  if (s === "") return "";
  const m = s.match(/^(\d{1,2})[:.]?(\d{2})$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : s;
}

export function parseSchedule(
  raw: string,
  /** Shapes the refusal message; the rule itself is the same either way. */
  from: "photo" | "text" = "photo",
): Schedule {
  let data: unknown;
  try {
    data = JSON.parse(stripFence(raw));
  } catch {
    throw new ReadError("Couldn't read that as a timetable. Try a sharper photo of the grid.");
  }
  if (!data || typeof data !== "object") throw new ReadError("That didn't look like a timetable.");
  const d = data as Record<string, unknown>;

  if (d.error === "no_schedule") {
    throw new ReadError(
      from === "photo"
        ? "There's no timetable in that picture. Photograph the schedule itself, straight on."
        : "There's no timetable in that text. Paste the grid — days, times and subjects.",
    );
  }

  const weeks: Week[] = asArray(d.weeks)
    .map((w) => {
      const wk = (w ?? {}) as Record<string, unknown>;
      const days: Day[] = asArray(wk.days)
        .map((dy) => {
          const day = (dy ?? {}) as Record<string, unknown>;
          const lessons: Lesson[] = asArray(day.lessons)
            .map((ls): Lesson | null => {
              const l = (ls ?? {}) as Record<string, unknown>;
              const subject = str(l.subject);
              // A lesson with nothing in it is noise, not a free period —
              // a free period is written down.
              if (!subject && !str(l.note)) return null;
              return {
                id: uid(),
                start: time(l.start),
                end: time(l.end),
                subject,
                teacher: strOrUndefined(l.teacher),
                room: strOrUndefined(l.room),
                note: strOrUndefined(l.note),
              };
            })
            .filter((l): l is Lesson => l !== null);
          return { id: uid(), name: str(day.name), lessons };
        })
        // A named day with no lessons is kept: "Fredag — studiedag" is
        // information, and dropping it makes the week look wrong.
        .filter((day) => day.name !== "" || day.lessons.length > 0);
      return { id: uid(), label: str(wk.label), days };
    })
    .filter((w) => w.days.length > 0);

  if (weeks.length === 0) {
    throw new ReadError("Couldn't find any days or lessons in that. Try a sharper photo.");
  }

  return {
    title: str(d.title),
    subtitle: strOrUndefined(d.subtitle) ?? null,
    weeks,
    notes: asArray(d.notes).map(str).filter(Boolean),
  };
}
