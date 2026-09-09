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
const allApply = (n: number) => (n === 2 ? "båda gäller" : `alla ${n} gäller`);

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
          return (
            <div className={choice ? "slot choice" : "slot"} key={slot[0].id}>
              {slot.map((l) => (
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
              {/* Neutral on purpose. A kept-together slot is sometimes even and odd
                  weeks and sometimes two groups that both run; saying "båda
                  veckorna" asserts a reason the sheet never gave. */}
              {choice && decided && !editable && slot.length > 1 && (
                <p className="choice-note">{allApply(slot.length)}</p>
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
                  <tr key={hour ?? "untimed"}>
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
        <div className="notes">
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
