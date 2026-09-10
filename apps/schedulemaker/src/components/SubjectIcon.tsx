"use client";

// A small drawing per subject.
//
// The knife and fork on lunch turned out to do more than decorate: on a sheet
// meant for a fridge, a child who does not yet read fluently can find the
// thing by its shape. This is the same idea for the rest of the week, in the
// same visual language — strokes in currentColor, no fills, nothing that
// depends on a colour surviving a black-and-white printer.
//
// Drawn on a 24 grid and printed at about 3.5mm, which is the constraint that
// decided every one of them: two tines rather than four, a globe with two
// lines rather than a map, a pencil rather than a palette. Anything with more
// detail closes into a smudge at that size, and a smudge is worse than
// nothing.
//
// Subjects with no unambiguous shape get no icon rather than a bad one.
// Slöjd, Teknik and SO/NO are deliberately absent: a hammer reads as
// woodwork but not as textiles, and half a subject is a wrong label.

type Key =
  | "meal"
  | "ball"
  | "note"
  | "pencil"
  | "book"
  | "speech"
  | "flask"
  | "globe"
  | "ruler"
  | "pot";

/**
 * Codes, and the words they become once named.
 *
 * Both, because the glossary rewrites the sheet as you name things and the
 * icon should not disappear the moment "Ma" becomes "Matematik".
 */
const FOR: Record<string, Key> = {
  lunch: "meal", lunchrast: "meal", frukost: "meal", mellanmål: "meal", mellis: "meal",

  ma: "ruler", matematik: "ruler",

  sv: "book", svenska: "book", sva: "book",

  en: "speech", eng: "speech", engelska: "speech",
  fr: "speech", franska: "speech", sp: "speech", spanska: "speech",
  ty: "speech", tyska: "speech", mo: "speech", modersmål: "speech",

  no: "flask", bi: "flask", fy: "flask", ke: "flask",
  biologi: "flask", fysik: "flask", kemi: "flask",

  so: "globe", hi: "globe", ge: "globe", re: "globe", sh: "globe",
  historia: "globe", geografi: "globe", religion: "globe", samhällskunskap: "globe",

  idh: "ball", id: "ball", idrott: "ball",

  mu: "note", musik: "note",

  bd: "pencil", bl: "pencil", bild: "pencil",

  hkk: "pot", hemkunskap: "pot",
};

/**
 * Which drawing a subject gets, if any.
 *
 * Tries the whole label first, then the word before a hyphen — so
 * "Ma-Problemlösning" is still maths, while "Extra studietid Matematik" gets
 * nothing, because its first word is not a subject and guessing from the last
 * one would put a ruler on a study period.
 */
export function iconFor(subject: string): Key | undefined {
  const s = subject.trim().toLowerCase().replace(/\s+/g, " ");
  // "Eng2" is English, group two. The group matters in the name and not at
  // all to the picture.
  const ungrouped = s.replace(/\s*\d+$/, "");
  // Hyphen only, never the slash: "Ma-Problemlösning" is maths, but "SO/NO"
  // is two subjects at once and half a label is a wrong one.
  return FOR[s] ?? FOR[ungrouped] ?? FOR[s.split(/[-–]/)[0].trim()];
}

/** Every path is stroked; none is filled. See the note on printers above. */
const PATHS: Record<Key, React.ReactNode> = {
  meal: (
    <>
      <path d="M7 3v5.4a2.3 2.3 0 0 0 4.6 0V3" />
      <path d="M9.3 10.8V21" />
      <path d="M17.4 3c1.7 1.9 1.7 5.6 0 7.5" />
      <path d="M17.4 10.5V21" />
    </>
  ),
  // The seams have to bow hard. Drawn flatter they straighten into two lines
  // across a circle, which reads as a struck-through sign — and a globe is
  // already in this set, so the ball has to be unmistakably not that: no
  // straight line anywhere in it.
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.8 10c3.6-3.4 10.8-3.4 14.4 0" />
      <path d="M4.8 14c3.6 3.4 10.8 3.4 14.4 0" />
    </>
  ),
  note: (
    <>
      <path d="M9.8 18.2V5.6l8.4-1.8v10.6" />
      <ellipse cx="7.4" cy="18.4" rx="2.5" ry="2.1" />
      <ellipse cx="15.8" cy="16.4" rx="2.5" ry="2.1" />
    </>
  ),
  pencil: (
    <>
      <path d="M17.4 3.6 20.4 6.6 9.6 17.4 5.4 18.6 6.6 14.4z" />
      <path d="M15 6l3 3" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.8C10 5.2 7.2 4.6 4.6 5.1v12.6c2.6-.5 5.4.1 7.4 1.7" />
      <path d="M12 6.8c2-1.6 4.8-2.2 7.4-1.7v12.6c-2.6-.5-5.4.1-7.4 1.7" />
    </>
  ),
  speech: (
    <>
      <path d="M20.4 11.6c0 3.9-3.8 7-8.4 7-.9 0-1.8-.1-2.6-.3l-5 1.7 1.6-4A6.6 6.6 0 0 1 3.6 11.6c0-3.9 3.8-7 8.4-7s8.4 3.1 8.4 7z" />
    </>
  ),
  flask: (
    <>
      <path d="M9.6 3v6.4L4.9 18a1.8 1.8 0 0 0 1.6 2.7h11a1.8 1.8 0 0 0 1.6-2.7l-4.7-8.6V3" />
      <path d="M8.6 3h6.8" />
      <path d="M7.4 14.6h9.2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c-3.6 3.4-3.6 13.6 0 17" />
      <path d="M12 3.5c3.6 3.4 3.6 13.6 0 17" />
    </>
  ),
  // A ruler was the first attempt and it read as a battery: at 3.5mm the tick
  // marks close up and all that is left is a rectangle. The signs a child
  // already meets in maths survive the size, because they are strokes.
  ruler: (
    <>
      <path d="M8.2 4.4v7.2M4.6 8h7.2" />
      <path d="M12.4 17.2h7.2" />
    </>
  ),
  pot: (
    <>
      <path d="M5 10.4h14v4.4a3.4 3.4 0 0 1-3.4 3.4H8.4A3.4 3.4 0 0 1 5 14.8z" />
      <path d="M5 12.2H2.8M19 12.2h2.2" />
      <path d="M8.4 7.2h7.2" />
    </>
  ),
};

export default function SubjectIcon({ subject }: { subject: string }) {
  const key = iconFor(subject);
  if (!key) return null;
  return (
    <svg className="subject-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[key]}
    </svg>
  );
}
