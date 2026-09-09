// What a timetable is, once it has been read off a piece of paper.
//
// Shaped by what Swedish school schedules actually look like, not by what a
// calendar library would want. Two things drove it:
//
// Times are strings, not minutes. "08:20" is copied as written and never
// arithmetic. A schedule that quietly renders 08:20 as 08:00 because someone
// parsed it into a number has told a child the wrong thing, and the whole
// point of this is that the paper on the fridge is right.
//
// A schedule holds *weeks*, plural. Swedish schools routinely print two grids
// — jämna and udda veckor — and a model asked for one grid will either merge
// them or silently pick one. Both are wrong in a way nobody notices until a
// Tuesday.

export type Lesson = {
  id: string;
  /** As printed: "08:20". Empty when the sheet gives no time. */
  start: string;
  end: string;
  subject: string;
  teacher?: string;
  room?: string;
  /** Anything else written in the cell, copied rather than interpreted. */
  note?: string;
};

export type Day = {
  id: string;
  /** In the source's own language: "Måndag", not "Monday". */
  name: string;
  lessons: Lesson[];
};

export type Week = {
  id: string;
  /** "Jämna veckor", "Vecka A", or "" when the sheet has only one grid. */
  label: string;
  days: Day[];
};

export type Schedule = {
  /** Whose schedule it is: "4B", "Astrid", "Avd. 3 natt". */
  title: string;
  /** School, term, ward — whatever the sheet says underneath. */
  subtitle: string | null;
  weeks: Week[];
  /** Footnotes from the sheet: "Idrott jämna veckor", "Ta med simsaker". */
  notes: string[];
};

/** Every lesson in the week, in printed order. */
export function lessonsOf(week: Week): Lesson[] {
  return week.days.flatMap((d) => d.lessons);
}

/**
 * The earliest and latest times in a week, for laying out a grid.
 *
 * Returns null when nothing has a time — a schedule of "Morning / Afternoon"
 * with no clock is a real thing, and it should render as a list rather than
 * be forced onto an hour axis.
 */
export function timeRange(week: Week): { from: string; to: string } | null {
  const times = lessonsOf(week)
    .flatMap((l) => [l.start, l.end])
    .filter((t) => /^\d{1,2}[:.]\d{2}$/.test(t))
    .map((t) => t.replace(".", ":").padStart(5, "0"));
  if (times.length === 0) return null;
  return { from: times.reduce((a, b) => (a < b ? a : b)), to: times.reduce((a, b) => (a > b ? a : b)) };
}
