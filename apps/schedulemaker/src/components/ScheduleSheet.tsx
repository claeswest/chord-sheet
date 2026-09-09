"use client";

import type { Lesson, Schedule } from "@/types/schedule";
import { say, type Glossary } from "@/lib/glossary";
import EditableText from "./EditableText";

// The printable sheet. A plain table, not a positioned hour grid.
//
// An hour grid looks better in a screenshot and is wrong on paper: school days
// have lessons of unequal length and gaps that mean something, and forcing
// them onto a fixed axis either squashes a 40-minute lesson or invents a
// 15-minute gap that isn't there. A column per day, in printed order, cannot
// misrepresent what was on the original.
//
// The same component renders the finished sheet and the editable one. Two
// components would drift, and the whole promise here is that what you edit is
// what comes out of the printer.

export default function ScheduleSheet({
  schedule,
  glossary,
  editable = false,
  onChange,
  onEditLesson,
}: {
  schedule: Schedule;
  glossary: Glossary;
  editable?: boolean;
  onChange?: (next: Schedule) => void;
  onEditLesson?: (weekId: string, dayId: string, lesson: Lesson) => void;
}) {
  const patch = (next: Partial<Schedule>) => onChange?.({ ...schedule, ...next });

  const renameDay = (weekId: string, dayId: string, name: string) =>
    patch({
      weeks: schedule.weeks.map((w) =>
        w.id !== weekId ? w : { ...w, days: w.days.map((d) => (d.id === dayId ? { ...d, name } : d)) },
      ),
    });

  return (
    <div className="sheet">
      <EditableText
        as="h1"
        value={schedule.title}
        placeholder="Vems schema?"
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

      {schedule.weeks.map((week) => (
        <section key={week.id}>
          {/* Only labelled when the sheet had more than one grid — a lone
              blank heading above a single week is noise. */}
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
              <tr>
                {week.days.map((day) => (
                  <td key={day.id}>
                    {day.lessons.map((l) => {
                      const subject = say(l.subject, glossary.subjects) ?? l.subject;
                      const teacher = say(l.teacher, glossary.teachers);
                      return (
                        <div
                          className={`lesson ${editable ? "editable" : ""}`}
                          key={l.id}
                          onClick={editable ? () => onEditLesson?.(week.id, day.id, l) : undefined}
                          tabIndex={editable ? 0 : undefined}
                          role={editable ? "button" : undefined}
                          onKeyDown={
                            editable
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onEditLesson?.(week.id, day.id, l);
                                  }
                                }
                              : undefined
                          }
                        >
                          {(l.start || l.end) && (
                            <div className="time">
                              {l.start}
                              {l.end && ` – ${l.end}`}
                            </div>
                          )}
                          <div className="subject">{subject}</div>
                          {(l.room || teacher || l.note) && (
                            <div className="where">
                              {[l.room, teacher, l.note].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      ))}

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
