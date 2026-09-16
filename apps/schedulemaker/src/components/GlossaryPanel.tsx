"use client";

// Name the codes once, and the whole sheet reads in words.
//
// Collapsed by default with a count, because eighteen boxes is what this looks
// like on a real timetable and it should not be the first thing between you
// and your schedule.
//
// The code stays visible beside its box rather than being replaced: you are
// translating from the paper the school sent, and you need to see which of
// "AAC" and "AnOh" you are naming right now.

import { useState } from "react";
import type { Schedule } from "@/types/schedule";
import { codesIn, worthNaming, type Glossary } from "@/lib/glossary";

export default function GlossaryPanel({
  schedule,
  glossary,
  onChange,
}: {
  schedule: Schedule;
  glossary: Glossary;
  onChange: (next: Glossary) => void;
}) {
  const { teachers, subjects } = codesIn(schedule);
  const named = worthNaming(subjects);

  const total = teachers.length + named.length;
  const done =
    teachers.filter((c) => glossary.teachers?.[c]?.trim()).length +
    named.filter((c) => glossary.subjects?.[c]?.trim()).length;

  const set = (kind: "teachers" | "subjects" | "colors", code: string, value: string) =>
    onChange({ ...glossary, [kind]: { ...glossary[kind], [code]: value } });

  // Decided on the first render and then left to the reader. As a prop it was
  // recomputed on every keystroke, so typing the first name made "0 av 33"
  // false and slammed the panel shut on the hands still typing in it.
  const [open, setOpen] = useState(done === 0);

  return (
    <details
      className="panel no-print"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="panel-title">Namn och färger</span>
        <span className="hint"> — {done} av {total} namngivna</span>
      </summary>

      <p className="hint" style={{ margin: "10px 0 14px" }}>
        Fyll i namn som ska visas i hela schemat. Lämna ett fält tomt för att behålla originalets text. Här kan du också ändra ämnesfärgerna.
      </p>

      {teachers.length > 0 && (
        <>
          <p className="panel-label">Lärare</p>
          <div className="pairs">
            {teachers.map((code) => (
              <label key={code} className="pair">
                <span className="code">{code}</span>
                <input
                  value={glossary.teachers?.[code] ?? ""}
                  onChange={(e) => set("teachers", code, e.target.value)}
                  // Not a name. A placeholder that reads as a real name, in a
                  // list where the box two along genuinely says Denise, makes
                  // it impossible to see what is filled in.
                  placeholder="Lärarens namn"
                  aria-label={`Namn för ${code}`}
                />
              </label>
            ))}
          </div>
        </>
      )}

      {named.length > 0 && (
        <>
          <p className="panel-label" style={{ marginTop: 18 }}>Ämnen</p>
          <div className="pairs">
            {named.map((code) => (
              <label key={code} className="pair">
                <span className="code">{code}</span>
                <input
                  value={glossary.subjects?.[code] ?? ""}
                  onChange={(e) => set("subjects", code, e.target.value)}
                  placeholder="Ämnets namn"
                  aria-label={`Namn för ${code}`}
                />
                <input
                  type="color"
                  className="tint"
                  value={glossary.colors?.[code] || "#e2ecff"}
                  onChange={(e) => set("colors", code, e.target.value)}
                  aria-label={`Färg för ${code}`}
                  title={`Färg för ${code}`}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </details>
  );
}
