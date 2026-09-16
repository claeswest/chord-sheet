"use client";

// Editing one lesson.
//
// A dialog rather than inline fields, because a lesson is six values in a box
// the size of a postage stamp on the sheet. Trying to edit that in place makes
// the cell jump and the printed layout is the thing being protected.
//
// The subject and teacher boxes show the code, not the glossary's name: this
// edits what the schedule says, and the glossary translates it afterwards.
// Typing "Denise" here would name the teacher in one cell and leave the other
// seven as DLE.

import { useState } from "react";
import type { Lesson } from "@/types/schedule";

export default function LessonEditor({
  lesson,
  onSave,
  onDelete,
  onClose,
}: {
  lesson: Lesson;
  onSave: (next: Lesson) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Lesson>(lesson);
  const set = (p: Partial<Lesson>) => setDraft({ ...draft, ...p });

  return (
    <div className="overlay no-print" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <p className="panel-title">Ändra lektion eller rast</p>

        <div className="row">
          <label>
            <span>Starttid</span>
            <input value={draft.start} onChange={(e) => set({ start: e.target.value })} placeholder="08:20" />
          </label>
          <label>
            <span>Sluttid</span>
            <input value={draft.end} onChange={(e) => set({ end: e.target.value })} placeholder="09:00" />
          </label>
        </div>

        <label className="full">
          <span>Ämne eller aktivitet</span>
          <input value={draft.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="MA" />
        </label>

        <div className="row">
          <label>
            <span>Lärare</span>
            <input
              value={draft.teacher ?? ""}
              onChange={(e) => set({ teacher: e.target.value || undefined })}
              placeholder="DLE"
            />
          </label>
          <label>
            <span>Sal</span>
            <input
              value={draft.room ?? ""}
              onChange={(e) => set({ room: e.target.value || undefined })}
              placeholder="401"
            />
          </label>
        </div>

        <label className="full">
          <span>Anteckning</span>
          <input
            value={draft.note ?? ""}
            onChange={(e) => set({ note: e.target.value || undefined })}
            placeholder="ta med gympapåse"
          />
        </label>

        <p className="hint" style={{ margin: "12px 0 0" }}>
          Skriv koderna som på originalet, till exempel MA eller KRN. Namnen fixar du under &ldquo;Namn och
          färger&rdquo; – då gäller de i hela schemat på en gång.
        </p>

        <div className="controls" style={{ marginTop: 16, marginBottom: 0 }}>
          <button className="primary" onClick={() => onSave(draft)}>Spara</button>
          <button onClick={onClose}>Avbryt</button>
          <button className="danger" onClick={onDelete} style={{ marginLeft: "auto" }}>
            Ta bort
          </button>
        </div>
      </div>
    </div>
  );
}
