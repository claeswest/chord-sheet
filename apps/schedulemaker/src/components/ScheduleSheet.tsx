"use client";

import { useEffect, useRef } from "react";
import type { Day, Lesson, Schedule, Week } from "@/types/schedule";
import { slotSpan, slotsOf, weekSpan } from "@/types/schedule";
import { inkOn, isBreak, say, type Glossary } from "@/lib/glossary";
import SubjectIcon from "./SubjectIcon";
import EditableText from "./EditableText";

// The printable sheet: a clock down the margin, a column per day, and every
// lesson as tall as it is long.
//
// It used to be a row per hour, with each lesson filed under the hour it
// started in. That was readable and wrong: a lesson from 10:55 to 11:50 sat in
// the ten o'clock row, so reading across eleven o'clock showed the next thing
// instead — the sheet said a child was at lunch while they were in NO. The
// school's own printout is proportional, with a half-hour scale down both
// margins, and it is proportional for exactly this reason. Length is
// information, and a grid that drops it invents a timetable nobody printed.
//
// The same component renders the finished sheet and the editable one. Two
// components would drift, and the promise here is that what you edit is what
// comes out of the printer.

/**
 * How tall a minute is.
 *
 * Sized so an ordinary school day fills the page rather than stopping three
 * quarters of the way down. A printed sheet measured 78% of an A4 landscape
 * page at 0.95, which is 31mm of paper doing nothing on a document whose whole
 * job is to be read from across a kitchen.
 *
 * Scaling the finished sheet up instead is not available: it is already
 * exactly 297mm wide, and zoom takes both dimensions, so anything above 1
 * would run off the sides. Making the minute taller adds height only.
 *
 * 1.08 rather than the 1.116 that would fill an empty page exactly, so the
 * common case has room to spare and prints at full size. Anything taller —
 * a longer day, a note or two underneath — is shrunk to fit by PrintFit, and
 * still comes out larger than it did at 0.95.
 */
const PX_PER_MIN = 1.08;

/**
 * Nothing may be shorter than this, or a very short slot is unreadable.
 *
 * Set to one line of compact type, which is what a 15-minute lesson comes to
 * at this scale — so the shortest thing on a real schedule sits exactly in its
 * own minutes, and only something shorter still has to borrow a pixel or two
 * from the next.
 */
const MIN_SLOT_PX = 14;

/** Below this a card can't hold three stacked lines, so it goes to one row. */
const COMPACT_PX = 34;

/**
 * Below this there is no second line to wrap onto, so the row has to truncate.
 *
 * A 30-minute box can take two lines and should use them rather than cut
 * "Extra studietid Matematik" down to "Extr…". A 15-minute one cannot, and
 * letting it wrap just pushes it onto the lesson below.
 */
const TIGHT_PX = 22;

/**
 * Type sized so a box of options fits the minutes it actually occupies.
 *
 * Wednesday's language block runs 09:50–10:45 and holds five of them. Set in
 * the normal size it would spill over the lunch below it and say the wrong
 * thing about both. The school's own sheet prints that exact block in its
 * smallest type for exactly this reason — so the shrinking is what the paper
 * does, not a workaround.
 *
 * Floored at 6px: past that it stops being readable, and a box that overflows
 * visibly beats one that is silently illegible.
 */
function optionFit(rows: number, height: number | null): React.CSSProperties | undefined {
  if (height === null) return undefined;
  const TIME_ROW = 13;
  const PADDING = 8;
  const rowH = Math.max(7, (height - TIME_ROW - PADDING) / rows);
  return {
    ["--opt-h" as string]: `${rowH}px`,
    ["--opt-font" as string]: `${Math.min(11.5, Math.max(6, rowH * 0.82))}px`,
  };
}

type Placed = { slot: Lesson[]; top: number; height: number; left: number; width: number };

/**
 * Lay one day's slots on the axis.
 *
 * Overlapping slots share the column's width rather than covering each other.
 * Two lessons at once shouldn't happen on a class timetable, but a misread
 * photo produces it, and stacking them would hide one completely — the failure
 * would be invisible, which is the worst kind on a sheet whose job is to be
 * checked against the original.
 */
function placeDay(slots: Lesson[][], from: number): { placed: Placed[]; untimed: Lesson[][] } {
  const timed: { slot: Lesson[]; from: number; to: number }[] = [];
  const untimed: Lesson[][] = [];

  for (const slot of slots) {
    const span = slotSpan(slot);
    if (span) timed.push({ slot, ...span });
    else untimed.push(slot);
  }
  timed.sort((a, b) => a.from - b.from || a.to - b.to);

  const placed: Placed[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf = cluster.map((s) => {
      let k = laneEnds.findIndex((end) => end <= s.from);
      if (k === -1) {
        k = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[k] = s.to;
      return k;
    });
    const width = 100 / laneEnds.length;
    cluster.forEach((s, i) => {
      placed.push({
        slot: s.slot,
        top: (s.from - from) * PX_PER_MIN,
        height: Math.max(MIN_SLOT_PX, (s.to - s.from) * PX_PER_MIN),
        left: laneOf[i] * width,
        width,
      });
    });
    cluster = [];
    clusterEnd = -1;
  };

  for (const s of timed) {
    if (cluster.length > 0 && s.from >= clusterEnd) flush();
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, s.to);
  }
  flush();

  return { placed, untimed };
}

/**
 * A tinted card carries its own ink, so the words contrast with the card
 * rather than with the paper behind it.
 *
 * Returns undefined for a break, which has no tint and takes the style's own
 * colours, and for a subject nobody has coloured.
 */
function tintedStyle(tint: string | undefined, pause: boolean): React.CSSProperties | undefined {
  if (!tint || pause) return undefined;
  const { ink, muted } = inkOn(tint);
  return { background: tint, color: ink, ["--card-muted" as string]: muted };
}

/** Past this the type stops being readable, so a box overflows visibly instead. */
const FIT_FLOOR = 0.62;

/** What the school itself prints across the top, until it is worth changing. */
const DEFAULT_HEADING = "SCHEMA";

/**
 * Room, teacher and note are joined with the bullet bound to the word before
 * it — a non-breaking space, then the bullet, then an ordinary one.
 *
 * "Hemkunskapssal L,104 · FiLo" is wider than a column and has to break
 * somewhere. Breaking at the space in front of the bullet starts the next line
 * with "· FiLo", which reads as a bullet list of one. This way the line ends
 * "…L,104 ·" and the break lands where a reader expects it.
 */
const SEP = " · ";

/**
 * Shrink any card whose text won't fit the minutes it has.
 *
 * How much text fits depends on the column's width, which depends on the
 * paper: on A4 landscape "Ma-Problemlösning" is one line, and on A4 portrait
 * the same column is 129px and it becomes two — one line more than its hour
 * can hold, so it spilled over the lesson below. No stylesheet can know that;
 * only measurement can.
 *
 * Steps down and re-measures rather than computing a ratio, because a smaller
 * font may re-flow a wrapped subject onto one line and win far more than any
 * ratio would predict.
 */
function useFitCards(ref: React.RefObject<HTMLDivElement | null>) {
  const rerun = useRef<() => void>(undefined);

  useEffect(() => {
    // Its own sheet, not the first one on the page. The front page renders a
    // sample sheet through this same component, and a global lookup would have
    // one instance measuring the other's boxes.
    const sheet = ref.current;
    if (!sheet) return;

    let queued = 0;
    const fit = (pass = 0) => {
      let unsettled = false;
      for (const slot of sheet.querySelectorAll<HTMLElement>(".col > .slot")) {
        const card = slot.querySelector<HTMLElement>(":scope > .lesson");
        if (!card) continue;
        card.style.removeProperty("--card-scale");
        const room = slot.clientHeight;

        const tallEnough = () => card.scrollHeight <= room;
        const wideEnough = () => {
          for (const el of card.querySelectorAll<HTMLElement>(".subject, .where")) {
            if (el.scrollWidth > el.clientWidth + 1) return false;
          }
          return true;
        };
        const set = (s: number) =>
          s === 1
            ? card.style.removeProperty("--card-scale")
            : card.style.setProperty("--card-scale", String(s));

        let scale = 1;
        // Height first, and it is not optional: a card taller than its slot
        // sits on top of the next lesson.
        for (let i = 0; i < 8 && scale > FIT_FLOOR && !tallEnough(); i++) {
          scale = Math.max(FIT_FLOOR, scale * 0.92);
          set(scale);
        }

        // Then width, which is: keep going while an ellipsis is still eating a
        // room number. Worth a couple of steps — Friday's pair of options wins
        // it at 78% on landscape.
        const forHeight = scale;
        for (let i = 0; i < 8 && scale > FIT_FLOOR && !wideEnough(); i++) {
          scale = Math.max(FIT_FLOOR, scale * 0.92);
          set(scale);
        }
        // But in a 129px portrait column "Extra studietid Matematik · 403 ·
        // MaAr,LiOv" does not fit at any readable size. Shrinking the whole
        // sheet to its floor and truncating anyway pays legibility for
        // nothing, so give it back.
        if (!wideEnough()) set((scale = forHeight));
        if (!tallEnough()) unsettled = true;
      }

      // A pass can land before the layout it is measuring has settled: the
      // width scaler and the print measurement both move things after the
      // render that scheduled this one, and on first load that left two boxes
      // sitting on the lesson below them until the next edit happened to fix
      // it. If anything is still too tall, the measurement was taken too
      // early — look again next frame. Bounded, because a box that overflows
      // at the floor will overflow on every pass.
      if (unsettled && pass < 2) queued = requestAnimationFrame(() => fit(pass + 1));
    };
    const later = () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => fit());
    };

    rerun.current = later;
    later();
    // Fonts settle after first paint, and metrics before they do are a
    // fallback face's, not the one that prints.
    document.fonts?.ready.then(later);
    document.fonts.addEventListener("loadingdone", later);
    // Switching to portrait halves the column width without changing nothing
    // else this component is told about.
    const ro = new ResizeObserver(later);
    ro.observe(sheet);
    return () => {
      rerun.current = undefined;
      document.fonts.removeEventListener("loadingdone", later);
      ro.disconnect();
      cancelAnimationFrame(queued);
    };
  }, [ref]);

  // Deliberately every render, with no dependency list. Anything that reaches
  // the sheet changes how much text is in it — a lesson edited, a teacher
  // named, a choice decided — and a list of the things that do would be a list
  // to keep correct forever. It is one measuring pass over about thirty boxes,
  // and it only runs when something has actually re-rendered.
  useEffect(() => {
    rerun.current?.();
  });
}

// "Båda" only when there are two. A language block offering English, French,
// Spanish and German is four choices, and a button that calls them both is
// wrong about the one slot on these sheets that most needs a decision.
const keepAll = (n: number) => (n === 2 ? "behåll båda" : `behåll alla ${n}`);

/**
 * A slot where everything was kept, drawn the way the paper drew it: one box.
 *
 * Five kept options used to be five stacked cards, each repeating the same
 * start time. On the original that block is a single box with the language
 * codes listed inside it, and five bordered cards said something the school
 * never said — that these are five things, one after another. One box, one
 * time, a line per option.
 *
 * The shared time is printed once at the top, but only when the options agree
 * on it. The odd-week Swedish in one of these runs 25 minutes past the
 * even-week art beside it, and hoisting one of those two end times to the top
 * of the box would put a time against a lesson that doesn't end then.
 */
function MergedCard({
  lessons,
  glossary,
  editable,
  choosing,
  fit,
  onKeepAll,
  onEditLesson,
}: {
  lessons: Lesson[];
  glossary: Glossary;
  editable: boolean;
  /** Nobody has decided yet: a row is an answer, not a lesson to edit. */
  choosing?: boolean;
  /** Type sized to the lesson's own minutes — see optionFit. */
  fit?: React.CSSProperties;
  onKeepAll?: () => void;
  onEditLesson?: (lesson: Lesson) => void;
}) {
  const start = lessons[0].start;
  const ends = new Set(lessons.map((l) => l.end).filter(Boolean));
  const sharedEnd = ends.size === 1 && lessons.every((l) => l.end) ? [...ends][0] : null;

  return (
    <div className={`lesson merged ${choosing ? "asking" : ""}`} style={fit}>
      {(start || sharedEnd || choosing) && (
        <div className="time">
          {/* "08:00" on its own read as a range someone forgot to finish. It
              is a shared start whose ends differ, and each row states its
              own — so say which of the two this is. */}
          {sharedEnd || !lessons.some((l) => l.end) ? start : `från ${start}`}
          {sharedEnd && ` – ${sharedEnd}`}
          {/* The question and its escape hatch ride in the time row. A separate
              bar below cost about 20px, which on a proportional grid is not
              spare space — it is the next lesson. */}
          {choosing && (
            <span className="ask no-print">
              <span className="ask-hint">välj det som gäller</span>
              <button className="pick" onClick={onKeepAll}>
                {keepAll(lessons.length)}
              </button>
            </span>
          )}
        </div>
      )}
      <ul className="options">
        {lessons.map((l) => {
          const subject = say(l.subject, glossary.subjects) ?? l.subject;
          const teacher = say(l.teacher, glossary.teachers);
          const tint = glossary.colors?.[l.subject.trim()];
          const detail = [l.room, teacher, l.note].filter(Boolean).join(SEP);

          return (
            <li
              key={l.id}
              className={`opt ${editable ? "editable" : ""} ${choosing ? "choosable" : ""}`}
              onClick={editable ? () => onEditLesson?.(l) : undefined}
              tabIndex={editable ? 0 : undefined}
              role={editable ? "button" : undefined}
              onKeyDown={
                editable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onEditLesson?.(l);
                      }
                    }
                  : undefined
              }
            >
              {tint && <span className="dot" style={{ background: tint }} aria-hidden />}
              <span className="subject">{subject}</span>
              {detail && <span className="where">{detail}</span>}
              {/* When the options don't end together there is no shared end to
                  hoist, so each row carries its own — pinned right, where it
                  can't be shortened. It sat at the tail of the room-and-teacher
                  line before, and in a narrow column the ellipsis ate it: the
                  box then showed a start time and no end at all. */}
              {!sharedEnd && l.end && <span className="until">{l.end}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LessonCard({
  lesson,
  glossary,
  editable,
  compact,
  tight,
  icons,
  onEdit,
}: {
  lesson: Lesson;
  glossary: Glossary;
  editable: boolean;
  /** Too short for stacked lines — everything on one row instead. */
  compact?: boolean;
  /** Too short even to wrap that row, so it truncates. */
  tight?: boolean;
  /** Draw the subject's little picture. */
  icons?: boolean;
  onEdit?: () => void;
}) {
  const subject = say(lesson.subject, glossary.subjects) ?? lesson.subject;
  const teacher = say(lesson.teacher, glossary.teachers);
  const tint = glossary.colors?.[lesson.subject.trim()];
  const pause = isBreak(lesson.subject);
  const where = [lesson.room, teacher, lesson.note].filter(Boolean).join(SEP);

  return (
    <div
      className={`lesson ${pause ? "pause" : ""} ${editable ? "editable" : ""} ${compact ? "compact" : ""} ${tight ? "tight" : ""}`}
      // The tint decides the text on top of it. Paper and ink flip with the
      // style; a subject's colour does not, so the card has to answer for its
      // own contrast. See inkOn.
      style={tintedStyle(tint, pause)}
      onClick={editable ? onEdit : undefined}
      tabIndex={editable ? 0 : undefined}
      role={editable ? "button" : undefined}
      onKeyDown={
        editable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit?.();
              }
            }
          : undefined
      }
    >
      {(lesson.start || lesson.end) && (
        <div className="time">
          {lesson.start}
          {lesson.end && ` – ${lesson.end}`}
        </div>
      )}
      {/* Subject and room on one line, as the school prints them: "SO LoAl
          401". Stacked on three lines, a 40-minute lesson could not hold its
          own text — and 40 minutes is the commonest lesson there is. */}
      <div className="body">
        {/* Outside .subject, so the fit measurement still measures text
            against the column and an ellipsis never eats half a drawing. */}
        {icons && <SubjectIcon subject={lesson.subject} />}
        <span className="subject">{subject}</span>
        {where && <span className="where">{where}</span>}
      </div>
    </div>
  );
}

export default function ScheduleSheet({
  schedule,
  glossary,
  editable = false,
  icons = true,
  onChange,
  onEditLesson,
  onAddLesson,
  onPickOption,
  onReopenChoice,
}: {
  schedule: Schedule;
  glossary: Glossary;
  editable?: boolean;
  /** Little subject drawings on the cards. */
  icons?: boolean;
  onChange?: (next: Schedule) => void;
  onEditLesson?: (weekId: string, dayId: string, lesson: Lesson) => void;
  onAddLesson?: (weekId: string, dayId: string) => void;
  /**
   * Decide a choice slot: keep one option, or keep them all.
   *
   * lessonId names the survivor; null keeps every option. Either way the slot
   * counts as decided, which is what the step to the finished sheet asks for.
   */
  onPickOption?: (weekId: string, dayId: string, lessonId: string | null, slotStart?: string) => void;
  /** Ask the question again: undo the decision, keep nothing set aside. */
  onReopenChoice?: (weekId: string, dayId: string, slotStart: string) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useFitCards(sheetRef);

  const patch = (next: Partial<Schedule>) => onChange?.({ ...schedule, ...next });

  const renameDay = (weekId: string, dayId: string, name: string) =>
    patch({
      weeks: schedule.weeks.map((w) =>
        w.id !== weekId ? w : { ...w, days: w.days.map((d) => (d.id === dayId ? { ...d, name } : d)) },
      ),
    });

  function SlotBox({
    week,
    day,
    slot,
    height,
    style,
  }: {
    week: Week;
    day: Day;
    slot: Lesson[];
    /** Null in the untimed strip, where boxes size themselves. */
    height: number | null;
    style?: React.CSSProperties;
  }) {
    const choice = slot.length > 1;
    const decided = slot.every((l) => l.resolved);
    // Only what's kept is drawn. The options set aside used to sit underneath,
    // faded, as the way back into the decision — on a proportional grid that
    // is a second lesson's worth of column for something "ändra val" already
    // does, and the set-aside options come back the moment it's clicked.
    const kept = slot.filter((l) => !l.hidden);
    const asking = choice && !decided && editable;

    // Every option set aside would mean a slot that decided on nothing. It
    // can't be reached from the UI, but drawing an empty box beats crashing.
    if (kept.length === 0) return null;

    return (
      <div
        className={`slot ${choice && editable ? "choice" : ""}`}
        style={height === null ? style : { ...style, height }}
      >
        {kept.length > 1 ? (
          <MergedCard
            lessons={kept}
            glossary={glossary}
            editable={editable}
            choosing={asking}
            // An open question keeps its full size and floats over the grid;
            // it has buttons to hit, and it stops existing once answered.
            fit={asking ? undefined : optionFit(kept.length, height)}
            onKeepAll={() => onPickOption?.(week.id, day.id, null, slot[0].start)}
            onEditLesson={(l) =>
              // Undecided: the row is the answer to the question the box is
              // asking. Decided: it is a lesson to edit.
              asking ? onPickOption?.(week.id, day.id, l.id) : onEditLesson?.(week.id, day.id, l)
            }
          />
        ) : (
          <LessonCard
            lesson={kept[0]}
            glossary={glossary}
            editable={editable}
            compact={height !== null && height < COMPACT_PX}
            tight={height !== null && height < TIGHT_PX}
            icons={icons}
            onEdit={() => onEditLesson?.(week.id, day.id, kept[0])}
          />
        )}
        {choice && decided && editable && (
          <button
            className="pick no-print"
            onClick={() => onReopenChoice?.(week.id, day.id, slot[0].start)}
          >
            ändra val
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="sheet" ref={sheetRef}>
      <div className="sheet-head">
        {/* undefined is a schedule read before this line existed and gets the
            default; "" is someone who deleted it on purpose and gets nothing. */}
        {(schedule.heading ?? DEFAULT_HEADING) !== "" || editable ? (
          <EditableText
            as="h1"
            className="banner"
            value={schedule.heading ?? DEFAULT_HEADING}
            placeholder="Rubrik, t.ex. Hannas schema"
            editable={editable}
            onChange={(heading) => patch({ heading })}
          />
        ) : null}
        <EditableText
          as="h2"
          value={schedule.title}
          placeholder="Klass eller grupp, t.ex. 7A"
          editable={editable}
          onChange={(title) => patch({ title })}
        />
        <EditableText
          as="p"
          className="subtitle"
          value={schedule.subtitle ?? ""}
          placeholder="Skola, termin…"
          editable={editable}
          onChange={(subtitle) => patch({ subtitle: subtitle || null })}
        />
      </div>

      {schedule.weeks.map((week) => {
        const span = weekSpan(week, editable);
        const days = week.days.map((day) => ({
          day,
          ...placeDay(slotsOf(day, editable), span?.from ?? 0),
        }));
        const anyUntimed = days.some((d) => d.untimed.length > 0);

        // Hour rules across the grid, and a fainter one at each half hour —
        // the same scale the school prints down both margins, and what makes a
        // 90-minute box legible as 90 minutes rather than just "tall".
        const marks: number[] = [];
        if (span) for (let m = span.from; m <= span.to; m += 30) marks.push(m);
        const y = (m: number) => (m - (span?.from ?? 0)) * PX_PER_MIN;

        return (
          <section key={week.id}>
            {(week.label || (editable && schedule.weeks.length > 1)) && (
              <EditableText
                as="p"
                className="week-label"
                value={week.label}
                placeholder="Vecka…"
                editable={editable}
                onChange={(label) =>
                  patch({ weeks: schedule.weeks.map((w) => (w.id === week.id ? { ...w, label } : w)) })
                }
              />
            )}

            <div className="tgrid">
              <div className="trow thead">
                <div className="gutter" />
                {week.days.map((day) => (
                  <div className="dayname" key={day.id}>
                    <EditableText
                      value={day.name}
                      placeholder="Dag"
                      editable={editable}
                      onChange={(name) => renameDay(week.id, day.id, name)}
                    />
                  </div>
                ))}
              </div>

              {span && (
                <div className="tbody" style={{ height: (span.to - span.from) * PX_PER_MIN }}>
                  <div className="gutter">
                    {marks.map((m) =>
                      m % 60 === 0 ? (
                        <span className="hlabel" key={m} style={{ top: y(m) }}>
                          {String(m / 60).padStart(2, "0")}
                        </span>
                      ) : null,
                    )}
                  </div>
                  <div className="lanes">
                    {marks.map((m) => (
                      <div
                        key={m}
                        className={m % 60 === 0 ? "rule hour" : "rule half"}
                        style={{ top: y(m) }}
                      />
                    ))}
                    {days.map(({ day, placed }) => (
                      <div className="col" key={day.id}>
                        {placed.map((p) => (
                          <SlotBox
                            key={p.slot[0].id}
                            week={week}
                            day={day}
                            slot={p.slot}
                            height={p.height}
                            style={{ top: p.top, left: `${p.left}%`, width: `${p.width}%` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(anyUntimed || editable) && (
                // Lessons the sheet gave no time to, plus somewhere to add one.
                // Unprintable when it holds nothing, so it doesn't count
                // against the fit measurement.
                <div className={`trow tfoot ${anyUntimed ? "" : "no-print"}`}>
                  <div className="gutter">{anyUntimed ? "utan tid" : ""}</div>
                  {days.map(({ day, untimed }) => (
                    <div className="footcell" key={day.id}>
                      {untimed.map((slot) => (
                        <SlotBox key={slot[0].id} week={week} day={day} slot={slot} height={null} />
                      ))}
                      {editable && (
                        <button
                          className="add-lesson no-print"
                          onClick={() => onAddLesson?.(week.id, day.id)}
                        >
                          + Lektion / paus
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {(schedule.notes.length > 0 || editable) && (
        // With no notes written, this block is just somewhere to add one — and
        // its 8mm top margin was the last of the gap between the shrink figure
        // quoted in edit and the one the printer gets.
        <div className={schedule.notes.length === 0 ? "notes no-print" : "notes"}>
          {schedule.notes.map((n, i) =>
            // An empty note is a row waiting to be typed into. It is not
            // something to print, so the finished sheet skips it.
            !editable && !n.trim() ? null : (
              <div className="note" key={i}>
                <EditableText
                  as="p"
                  value={n}
                  placeholder="Anteckning"
                  editable={editable}
                  onChange={(text) =>
                    patch({ notes: schedule.notes.map((old, j) => (j === i ? text : old)) })
                  }
                />
                {editable && (
                  // Clearing the text used to be the only way to delete a
                  // note, which is not something anyone would guess.
                  <button
                    className="drop-note no-print"
                    aria-label="Ta bort anteckningen"
                    title="Ta bort"
                    onClick={() => patch({ notes: schedule.notes.filter((_, j) => j !== i) })}
                  >
                    ×
                  </button>
                )}
              </div>
            ),
          )}
          {editable && (
            <button
              className="add-note no-print"
              // Enter leaves the focus on this button, so holding it down adds
              // a note per keypress. One empty row is enough to type into.
              disabled={schedule.notes.at(-1) === ""}
              onClick={() => patch({ notes: [...schedule.notes, ""] })}
            >
              + Lägg till anteckning
            </button>
          )}
        </div>
      )}
    </div>
  );
}
