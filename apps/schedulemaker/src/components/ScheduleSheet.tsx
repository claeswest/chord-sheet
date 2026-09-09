import type { Schedule } from "@/types/schedule";

// The printable sheet. A plain table, not a positioned hour grid.
//
// An hour grid looks better in a screenshot and is wrong on paper: Swedish
// school days have lessons of unequal length and gaps that mean something, and
// forcing them onto a fixed axis either squashes a 40-minute lesson or invents
// a 15-minute gap that isn't there. A column per day, in printed order, cannot
// misrepresent what was on the original.

export default function ScheduleSheet({ schedule }: { schedule: Schedule }) {
  return (
    <div className="sheet">
      <h1>{schedule.title || "Schema"}</h1>
      {schedule.subtitle && <p className="subtitle">{schedule.subtitle}</p>}

      {schedule.weeks.map((week) => (
        <section key={week.id}>
          {/* Only labelled when the sheet had more than one grid — a lone
              "" heading above a single week is noise. */}
          {week.label && <p className="week-label">{week.label}</p>}
          <table className="grid">
            <thead>
              <tr>
                {week.days.map((day) => (
                  <th key={day.id} scope="col">{day.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {week.days.map((day) => (
                  <td key={day.id}>
                    {day.lessons.map((l) => (
                      <div className="lesson" key={l.id}>
                        {(l.start || l.end) && (
                          <div className="time">
                            {l.start}
                            {l.end && ` – ${l.end}`}
                          </div>
                        )}
                        <div className="subject">{l.subject}</div>
                        {(l.room || l.teacher || l.note) && (
                          <div className="where">
                            {[l.room, l.teacher, l.note].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      ))}

      {schedule.notes.length > 0 && (
        <div className="notes">
          {schedule.notes.map((n, i) => (
            <p key={i} style={{ margin: "0 0 2mm" }}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}
