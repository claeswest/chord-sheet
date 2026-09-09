"use client";

import type { Day, Lesson, Schedule, Week } from "@/types/schedule";
import { hoursOf, slotsOf, startHour } from "@/types/schedule";
import { isMinor, say, type Glossary } from "@/lib/glossary";
import EditableText from "./EditableText";

// The printable sheet: one row per hour, one column per day.
//
// Not a proportional grid. Keeping the scale honest would mean squashing a
// 40-minute lesson or inventing a gap, and the sheet's whole job is to say
// what the paper said. Not a plain list either: with ten slots in a Monday
// column, "what happens at ten" meant reading every card. An hour per row
// aligns the days, which is what the clock down the margin of the original was
// doing, and every card still prints its own exact times.
//
// The same component renders the finished sheet and the editable one. Two
// components would drift, and the promise here is that what you edit is what
// comes out of the printer.

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
  onEditLesson,
}: {
  lessons: Lesson[];
  glossary: Glossary;
  editable: boolean;
  onEditLesson?: (lesson: Lesson) => void;
}) {
  const start = lessons[0].start;
  const ends = new Set(lessons.map((l) => l.end).filter(Boolean));
  const sharedEnd = ends.size === 1 && lessons.every((l) => l.end) ? [...ends][0] : null;

  return (
    <div className="lesson merged">
      {(start || sharedEnd) && (
        <div className="time">
          {start}
          {sharedEnd && ` – ${sharedEnd}`}
        </div>
      )}
      <ul className="options">
        {lessons.map((l) => {
          const subject = say(l.subject, glossary.subjects) ?? l.subject;
          const teacher = say(l.teacher, glossary.teachers);
          const tint = glossary.colors?.[l.subject.trim()];
          const detail = [l.room, teacher, l.note, sharedEnd ? null : l.end && `slut ${l.end}`]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={l.id}
              className={editable ? "opt editable" : "opt"}
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
  faded,
  choosing,
  onEdit,
}: {
  lesson: Lesson;
  glossary: Glossary;
  editable: boolean;
  faded: boolean;
  /** This card is one of several options nobody has decided between yet. */
  choosing?: boolean;
  onEdit?: () => void;
}) {
  const subject = say(lesson.subject, glossary.subjects) ?? lesson.subject;
  const teacher = say(lesson.teacher, glossary.teachers);
  const tint = glossary.colors?.[lesson.subject.trim()];
  const quiet = isMinor(lesson.subject);

  return (
    <div
      className={`lesson ${quiet ? "minor" : ""} ${faded ? "set-aside" : ""} ${editable ? "editable" : ""} ${choosing ? "choosable" : ""}`}
      style={tint && !quiet && !faded ? { background: tint } : undefined}
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
      <div className="subject">{subject}</div>
      {(lesson.room || teacher || lesson.note) && (
        <div className="where">{[lesson.room, teacher, lesson.note].filter(Boolean).join(" · ")}</div>
      )}
    </div>
  );
}

export default function ScheduleSheet({
  schedule,
  glossary,
  editable = false,
  onChange,
  onEditLesson,
  onAddLesson,
  onPickOption,
  onReopenChoice,
}: {
  schedule: Schedule;
  glossary: Glossary;
  editable?: boolean;
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
  const patch = (next: Partial<Schedule>) => onChange?.({ ...schedule, ...next });

  const renameDay = (weekId: string, dayId: string, name: string) =>
    patch({
      weeks: schedule.weeks.map((w) =>
        w.id !== weekId ? w : { ...w, days: w.days.map((d) => (d.id === dayId ? { ...d, name } : d)) },
      ),
    });

  /** The slots of one day that start in a given hour; null means "no time". */
  const slotsAt = (day: Day, hour: number | null) =>
    slotsOf(day, editable).filter((slot) => startHour(slot[0]) === hour);

  const untimed = (week: Week) =>
    week.days.some((d) => slotsOf(d, editable).some((s) => startHour(s[0]) === null));

  function DayCell({ week, day, hour }: { week: Week; day: Day; hour: number | null }) {
    return (
      <td>
        {slotsAt(day, hour).map((slot) => {
          const choice = slot.length > 1;
          const decided = slot.every((l) => l.resolved);
          const kept = slot.filter((l) => !l.hidden);
          // Everything survived the decision: one box, as on the paper. The
          // set-aside ones still render below it in edit mode so the choice
          // can be changed; print drops them.
          const merged = choice && decided && kept.length > 1;
          return (
            // The dashed frame marks a question. Once it's answered — and in
            // the finished sheet, where every slot is — the frame around a
            // single box is a second box saying nothing.
            <div className={choice && editable ? "slot choice" : "slot"} key={slot[0].id}>
              {merged && (
                <MergedCard
                  lessons={kept}
                  glossary={glossary}
                  editable={editable}
                  onEditLesson={(l) => onEditLesson?.(week.id, day.id, l)}
                />
              )}
              {(merged ? slot.filter((l) => l.hidden) : slot).map((l) => (
                <div key={l.id} className="option">
                  <LessonCard
                    lesson={l}
                    glossary={glossary}
                    editable={editable}
                    faded={Boolean(l.hidden) && (!choice || decided)}
                    choosing={choice && editable && !decided}
                    onEdit={() =>
                      // Undecided: the card is the answer to the question the
                      // slot is asking. Decided: it is a lesson to edit. Five
                      // "bara denna" buttons stacked under five options was
                      // most of why this slot was 370px tall.
                      choice && !decided
                        ? onPickOption?.(week.id, day.id, l.id)
                        : onEditLesson?.(week.id, day.id, l)
                    }
                  />
                </div>
              ))}
              {choice && !decided && (
                <div className="choice-ask no-print">
                  <span>Klicka det som gäller</span>
                  <button
                    className="pick"
                    onClick={() => onPickOption?.(week.id, day.id, null, slot[0].start)}
                  >
                    {keepAll(slot.length)}
                  </button>
                </div>
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
        })}
        {hour === null && editable && (
          <button className="add-lesson no-print" onClick={() => onAddLesson?.(week.id, day.id)}>
            + pass
          </button>
        )}
      </td>
    );
  }

  return (
    <div className="sheet">
      <EditableText
        as="h1"
        value={schedule.title}
        placeholder="Vems schema? T.ex. Astrids schema"
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

      {schedule.weeks.map((week) => {
        const hours = hoursOf(week);
        const rows: (number | null)[] = [...hours];
        // A trailing row for anything the sheet gave no time for, and in edit
        // mode always, so there is somewhere to put a new lesson.
        if (untimed(week) || editable) rows.push(null);

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
            <table className="grid">
              <thead>
                <tr>
                  <th className="hour-col" />
                  {week.days.map((day) => (
                    <th key={day.id} scope="col">
                      <EditableText
                        value={day.name}
                        placeholder="Dag"
                        editable={editable}
                        onChange={(name) => renameDay(week.id, day.id, name)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((hour) => (
                  // The trailing row holds nothing but "+ pass" when the sheet
                  // gave every lesson a time. Marking it unprintable keeps it
                  // out of the fit measurement too, which was quoting a
                  // shrink of 63 % in edit for a sheet that prints at 74 %.
                  <tr
                    key={hour ?? "untimed"}
                    className={hour === null && !untimed(week) ? "no-print" : undefined}
                  >
                    <th className="hour-col" scope="row">
                      {hour === null ? "" : `${String(hour).padStart(2, "0")}`}
                    </th>
                    {week.days.map((day) => (
                      <DayCell key={day.id} week={week} day={day} hour={hour} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      {(schedule.notes.length > 0 || editable) && (
        // With no notes written, this block is just somewhere to add one — and
        // its 8mm top margin was the last of the gap between the shrink figure
        // quoted in edit and the one the printer gets.
        <div className={schedule.notes.length === 0 ? "notes no-print" : "notes"}>
          {schedule.notes.map((n, i) => (
            <EditableText
              key={i}
              as="p"
              value={n}
              placeholder="Anteckning"
              editable={editable}
              onChange={(text) =>
                patch({
                  notes: text
                    ? schedule.notes.map((old, j) => (j === i ? text : old))
                    : schedule.notes.filter((_, j) => j !== i),
                })
              }
            />
          ))}
          {editable && (
            <button
              className="add-note no-print"
              onClick={() => patch({ notes: [...schedule.notes, "Ny anteckning"] })}
            >
              + Lägg till anteckning
            </button>
          )}
        </div>
      )}
    </div>
  );
}
