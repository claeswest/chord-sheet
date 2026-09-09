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
  /**
   * A human has decided what to do with this slot's choice.
   *
   * Separate from `hidden` because keeping every option can be the right
   * answer: a cell split into "BL jv" and "SV uv" is art on even weeks and
   * Swedish on odd, and both are true. A gate that demanded one would be
   * wrong about half this child's Fridays. So the question is whether someone
   * looked, not whether they narrowed it.
   */
  resolved?: boolean;
  /**
   * Set aside: an option in a choice slot that isn't the one this child takes.
   *
   * Kept rather than deleted. The sheet said five languages and the paper is
   * the record; picking German should not destroy the evidence that Spanish
   * was on offer, and changing your mind next term should not mean
   * photographing the schedule again.
   */
  hidden?: boolean;
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

/**
 * Lessons that occupy the same slot, grouped.
 *
 * Two lessons with the same start time are not one after the other — they are
 * alternatives. On these sheets that happens two ways: a language block
 * offering French, Spanish and German in one cell, and a cell split into
 * "BL jv" and "SV uv" for even and odd weeks. Rendering them as a stack of
 * consecutive cards says something false about the day.
 *
 * Grouped on start time alone. An end time can differ between alternatives —
 * the odd-week Swedish on one of these runs 25 minutes longer than the
 * even-week art beside it — and requiring both to match would split a pair
 * that the paper clearly shows as one box.
 */
export function slotsOf(day: Day, includeHidden = false): Lesson[][] {
  const slots: Lesson[][] = [];
  for (const lesson of day.lessons) {
    if (lesson.hidden && !includeHidden) continue;
    const last = slots[slots.length - 1];
    if (last && lesson.start !== "" && last[0].start === lesson.start) last.push(lesson);
    else slots.push([lesson]);
  }
  return slots;
}

/**
 * Minutes past midnight, for laying out a time axis. Null when unparseable.
 *
 * This is the one place a printed time becomes a number, and it stays inside
 * layout: what a card prints is still the string the sheet gave. Position is
 * arithmetic; the text is a quotation.
 */
export function minutesOf(time: string): number | null {
  const m = time.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 23 || min > 59 ? null : h * 60 + min;
}

/**
 * How long a lesson runs. A timed lesson with no end gets a nominal length —
 * it has to occupy something, and a zero-height box would vanish.
 */
const ASSUMED_MINUTES = 40;

export function lessonSpan(lesson: Lesson): { from: number; to: number } | null {
  const from = minutesOf(lesson.start);
  if (from === null) return null;
  const to = minutesOf(lesson.end);
  return { from, to: to !== null && to > from ? to : from + ASSUMED_MINUTES };
}

/** A slot runs from its shared start to the latest end among its options. */
export function slotSpan(slot: Lesson[]): { from: number; to: number } | null {
  const spans = slot.map(lessonSpan).filter((s) => s !== null);
  if (spans.length === 0) return null;
  return {
    from: Math.min(...spans.map((s) => s.from)),
    to: Math.max(...spans.map((s) => s.to)),
  };
}

/**
 * The clock range a week needs, rounded out to whole hours.
 *
 * Rounded out rather than starting at the first lesson so the axis reads in
 * whole hours, the way the original's margin does.
 */
export function weekSpan(week: Week, includeHidden = false): { from: number; to: number } | null {
  const spans = week.days
    .flatMap((d) => slotsOf(d, includeHidden))
    .map(slotSpan)
    .filter((s) => s !== null);
  if (spans.length === 0) return null;
  const from = Math.min(...spans.map((s) => s.from));
  const to = Math.max(...spans.map((s) => s.to));
  return { from: Math.floor(from / 60) * 60, to: Math.ceil(to / 60) * 60 };
}

/** Choice slots nobody has decided about yet. */
export function unresolvedChoices(schedule: Schedule): number {
  let n = 0;
  for (const week of schedule.weeks) {
    for (const day of week.days) {
      for (const slot of slotsOf(day, true)) {
        if (slot.length > 1 && !slot.every((l) => l.resolved)) n++;
      }
    }
  }
  return n;
}
