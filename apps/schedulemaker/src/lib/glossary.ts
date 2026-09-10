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
  /** "MA" → "#f4c9de". The school's own sheet is colour-coded and that is how
   *  a child finds Tuesday; a monochrome copy throws that away. */
  colors: Record<string, string>;
};

export const EMPTY_GLOSSARY: Glossary = { teachers: {}, subjects: {}, colors: {} };

/**
 * A glossary with every map present, whatever was handed in.
 *
 * Anything restored from storage was written by an older version of this file,
 * and an older version had fewer maps. Reading `glossary.colors[code]` off a
 * two-map object throws and takes the whole page with it — which is exactly
 * what happened the first time colours shipped to a browser that already had a
 * schedule saved. JSON.parse succeeds on that data; only the shape is old, so
 * a try/catch around parsing never sees it.
 */
export function normalizeGlossary(g: Partial<Glossary> | null | undefined): Glossary {
  return {
    teachers: g?.teachers ?? {},
    subjects: g?.subjects ?? {},
    colors: g?.colors ?? {},
  };
}

/**
 * Subject codes standard enough across Swedish schools to fill in unasked.
 *
 * Only the ones that are not a guess. "Sv" is Svenska everywhere; "Sp" is
 * Spanska on one sheet and Språkval on the next, so it stays a code. NO and SO
 * are missing on purpose — they are what everyone actually calls them, and
 * writing "Naturorienterande ämnen" across a Tuesday helps nobody.
 *
 * Short forms where the short form is the spoken one: Idrott, not "Idrott och
 * hälsa"; Hemkunskap, not "Hem- och konsumentkunskap". These have to fit in a
 * column an inch wide, and the long name would push out the room number.
 *
 * Matched whole and case-insensitively, so "Eng2" — English, group two — is
 * left alone rather than being flattened to Engelska and losing the group.
 */
const KNOWN_SUBJECTS: Record<string, string> = {
  sv: "Svenska",
  sva: "Svenska som andraspråk",
  ma: "Matematik",
  en: "Engelska",
  eng: "Engelska",
  ty: "Tyska",
  fr: "Franska",
  bi: "Biologi",
  fy: "Fysik",
  ke: "Kemi",
  ge: "Geografi",
  hi: "Historia",
  re: "Religion",
  sh: "Samhällskunskap",
  bd: "Bild",
  bl: "Bild",
  mu: "Musik",
  sl: "Slöjd",
  "sl tr": "Träslöjd",
  "sl tx": "Textilslöjd",
  idh: "Idrott",
  id: "Idrott",
  hkk: "Hemkunskap",
  tk: "Teknik",
  te: "Teknik",
  mo: "Modersmål",
};

/** The name this app would fill in for a code, if it knows one. */
export function suggestedName(code: string): string | undefined {
  return KNOWN_SUBJECTS[code.trim().toLowerCase().replace(/\s+/g, " ")];
}

/**
 * Writes in the names it is sure of, leaving everything else as printed.
 *
 * Keyed on whether the code has been *touched*, not on whether it is empty.
 * Clearing a name is how you say "print the code as the school wrote it", and
 * refilling it on the next load would overrule that every time the page
 * opened.
 */
export function withKnownNames(glossary: Glossary, subjects: string[]): Glossary {
  const named = { ...normalizeGlossary(glossary).subjects };
  for (const code of subjects) {
    if (code in named) continue;
    const guess = suggestedName(code);
    if (guess && guess.toLowerCase() !== code.trim().toLowerCase()) named[code] = guess;
  }
  return { ...normalizeGlossary(glossary), subjects: named };
}

/**
 * Colours assigned to subjects on first read, so the sheet arrives looking
 * like something rather than a wall of one blue.
 *
 * Pale on purpose. These sit behind black text on paper, and a saturated fill
 * costs a fortune in ink and makes the text harder to read at arm's length —
 * which is the one thing this document has to do.
 */
/**
 * A hue per subject, spaced by the golden angle.
 *
 * A fixed list of ten was the first attempt and it wrapped: a real timetable
 * has thirty-odd codes, so "SO", "Sl tx" and "Prov-komplettering" all came out
 * the same pale green. Colour is a key — "the pink one is maths" — and a key
 * that repeats is worse than no key, because it invites a wrong reading rather
 * than no reading.
 *
 * 137.508° is the angle that keeps every next hue as far as possible from all
 * the previous ones, so neighbours in the list are never neighbours in colour.
 *
 * Saturation and lightness are fixed and pale: these sit behind black text on
 * paper, read at arm's length, printed on whatever is in the machine.
 */
function tintFor(index: number): string {
  const hue = (index * 137.508) % 360;
  return hslToHex(hue, 0.62, 0.92);
}

/**
 * Text that contrasts with the card it sits on, not with the paper.
 *
 * A subject tint is stored data — one hue per subject, the same value whatever
 * style the sheet is printed in — while the ink flips with the style. On the
 * dark paper the two met: near-white text on a pale pink card measured 1.16 to
 * 1, against the 4.5 that readable body text needs. Every lesson on the sheet,
 * which is to say all of its content, was unreadable.
 *
 * The same trap is one colour-picker click away in every other style: the
 * glossary lets anyone choose navy for Matematik, and dark text on navy fails
 * exactly as badly.
 *
 * 0.179 is where the two candidates cross — above it black wins, below it
 * white does — so this is the choice the contrast formula would make, not a
 * guess at one.
 */
export function inkOn(hex: string): { ink: string; muted: string } {
  const light = luminance(hex) > 0.179;
  return light
    ? { ink: "#1a1a1a", muted: "#5f5f68" }
    : { ink: "#f4f5ff", muted: "#c5cae8" };
}

function luminance(hex: string): number {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return 1; // unparseable: assume a light card and keep dark ink
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Fills in a colour for every subject that hasn't got one. */
export function withDefaultColors(glossary: Glossary, subjects: string[]): Glossary {
  const colors = { ...normalizeGlossary(glossary).colors };
  let next = 0;
  for (const code of subjects) {
    if (colors[code]) continue;
    // Breaks stay uncoloured — they are not a subject, and the sheet gives
    // them a band of their own instead.
    colors[code] = isBreak(code) ? "" : tintFor(next++);
  }
  return { ...glossary, colors };
}

/**
 * Every distinct code, most-used first.
 *
 * A real timetable produced 36 of them in first-seen order, which put "MaAr",
 * who teaches six lessons, somewhere in the middle and "PhHe", who teaches
 * one, above him. Naming the four that matter should not mean reading
 * thirty-six boxes to find them.
 */
export function codesIn(schedule: Schedule): { teachers: string[]; subjects: string[] } {
  const teacherCount = new Map<string, number>();
  const subjectCount = new Map<string, number>();
  const teachers: string[] = [];
  const subjects: string[] = [];
  for (const week of schedule.weeks) {
    for (const day of week.days) {
      for (const l of day.lessons) {
        // A cell can name two people — "MaAr,LiOv" — and each is its own code.
        for (const t of (l.teacher ?? "").split(/[,/]/).map((s) => s.trim())) {
          if (!t) continue;
          if (!teachers.includes(t)) teachers.push(t);
          teacherCount.set(t, (teacherCount.get(t) ?? 0) + 1);
        }
        const s = l.subject.trim();
        if (!s) continue;
        if (!subjects.includes(s)) subjects.push(s);
        subjectCount.set(s, (subjectCount.get(s) ?? 0) + 1);
      }
    }
  }
  // Stable: equal counts keep first-seen order rather than shuffling between
  // renders, which would move a box out from under the cursor.
  const by = (counts: Map<string, number>, order: string[]) => (a: string, b: string) =>
    (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || order.indexOf(a) - order.indexOf(b);

  return {
    teachers: [...teachers].sort(by(teacherCount, teachers)),
    subjects: [...subjects].sort(by(subjectCount, subjects)),
  };
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
/**
 * A break: not a lesson, but not nothing either.
 *
 * These used to be lumped in with administrative slots and both were faded
 * out together. They are not the same thing. Lunch is the fixed point a school
 * day is measured against — "before lunch" and "after lunch" is how a child
 * describes their own day — so it earns a shape of its own on the sheet,
 * distinct from a lesson without being quieter than one.
 *
 * A break has no subject colour because it is not a subject; it gets a band
 * instead, in the sheet's stylesheet.
 */
const BREAK_WORDS = /^(lunch|rast|frukost|mellanmål|håltimme|paus)$/i;

export function isBreak(subject: string): boolean {
  return BREAK_WORDS.test(subject.trim());
}

/**
 * A break you eat at, as opposed to one you just have.
 *
 * Narrower than isBreak on purpose: a knife and fork against "Rast" or
 * "Håltimme" would be telling a child there is food when there isn't.
 */
const MEAL_WORDS = /^(lunch|lunchrast|frukost|mellanmål|mellis)$/i;

export function isMeal(subject: string): boolean {
  return MEAL_WORDS.test(subject.trim());
}

/**
 * Everything else is a lesson, including "Extra studietid Matematik" and
 * "Prov-komplettering".
 *
 * They were treated as filler and left uncoloured, which on a sheet where
 * every other block is coloured does not read as unimportant — it reads as
 * unfinished. They are also real: they have a room, a teacher and a time, and
 * a child who misses one has missed something. Colour them like the rest, and
 * let whoever prints it decide otherwise.
 */
export function worthNaming(codes: string[]): string[] {
  // 32 rather than 24: "Extra studietid Matematik" is 25 characters, and the
  // cap was quietly deciding it wasn't worth naming.
  return codes.filter((c) => !isBreak(c) && c.length <= 32);
}
