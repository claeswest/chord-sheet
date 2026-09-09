// Turning the school's codes into words a child can read.
//
// A timetable is written for the people who made it: "MA AAC" is a subject
// code and a teacher's initials. It is the single biggest reason a printed
// schedule is worse than it could be — the information is all there and none
// of it is legible to the person it is for.
//
// A mapping rather than per-cell editing, because a code repeats. "DLE"
// appears eight times on one of these sheets; typing "Denise" eight times is
// tedious, and the ninth time you would type "Denice".

import type { Schedule } from "@/types/schedule";

export type Glossary = {
  /** "DLE" → "Denise" */
  teachers: Record<string, string>;
  /** "MA" → "Matematik" */
  subjects: Record<string, string>;
};

export const EMPTY_GLOSSARY: Glossary = { teachers: {}, subjects: {} };

/** Every distinct code in the schedule, in the order it first appears. */
export function codesIn(schedule: Schedule): { teachers: string[]; subjects: string[] } {
  const teachers: string[] = [];
  const subjects: string[] = [];
  for (const week of schedule.weeks) {
    for (const day of week.days) {
      for (const l of day.lessons) {
        // A cell can name two people — "MaAr,LiOv" — and each is its own code.
        for (const t of (l.teacher ?? "").split(/[,/]/).map((s) => s.trim())) {
          if (t && !teachers.includes(t)) teachers.push(t);
        }
        const s = l.subject.trim();
        if (s && !subjects.includes(s)) subjects.push(s);
      }
    }
  }
  return { teachers, subjects };
}

/**
 * Applies the glossary to one field.
 *
 * An unmapped code is left exactly as printed. A half-filled glossary must
 * never turn a room number into a blank: what the sheet said is always better
 * than nothing, and this is a document someone acts on.
 */
export function say(value: string | undefined, map: Record<string, string>): string | undefined {
  if (!value) return value;
  return value
    .split(/([,/])/) // keep the separators, so "MaAr,LiOv" stays a pair
    .map((part) => {
      const key = part.trim();
      if (key === "" || key === "," || key === "/") return part;
      const named = map[key]?.trim();
      return named ? part.replace(key, named) : part;
    })
    .join("");
}

/**
 * Which codes are worth asking about.
 *
 * Lunch and Rast are not subjects anyone needs renamed, and offering to
 * rename them buries the four codes that matter under a list of things that
 * are already words.
 */
const ALREADY_WORDS = /^(lunch|rast|frukost|mellanmål|studietid|håltimme)$/i;

export function worthNaming(codes: string[]): string[] {
  return codes.filter((c) => !ALREADY_WORDS.test(c) && c.length <= 24);
}
