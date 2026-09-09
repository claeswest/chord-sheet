"use client";

// Name the codes once, and the whole sheet reads in words.
//
// Deliberately shows the code beside its box rather than replacing it: you are
// translating from the paper the school sent, and you need to see which of the
// two "AAC" and "AnOh" you are currently naming. It also means an empty box is
// obviously "not named yet" rather than looking like a mistake.

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

  const set = (kind: "teachers" | "subjects", code: string, value: string) =>
    onChange({ ...glossary, [kind]: { ...glossary[kind], [code]: value } });

  return (
    <div className="panel no-print">
      <p className="panel-title">Skriv ut namnen i klartext</p>
      <p className="hint" style={{ margin: "0 0 14px" }}>
        Lämna tomt så står koden kvar som på originalet.
      </p>

      {teachers.length > 0 && (
        <>
          <p className="panel-label">Lärare</p>
          <div className="pairs">
            {teachers.map((code) => (
              <label key={code} className="pair">
                <span className="code">{code}</span>
                <input
                  value={glossary.teachers[code] ?? ""}
                  onChange={(e) => set("teachers", code, e.target.value)}
                  placeholder="Denise"
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
                  value={glossary.subjects[code] ?? ""}
                  onChange={(e) => set("subjects", code, e.target.value)}
                  placeholder="Matematik"
                  aria-label={`Namn för ${code}`}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
