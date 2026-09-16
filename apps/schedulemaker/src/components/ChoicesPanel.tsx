"use client";

// The decisions step two is waiting on, in one place, as buttons.
//
// A school sheet puts alternatives in one cell — five languages at 08:10, two
// kinds of slöjd — and the finished schedule can't be printed until each has
// been answered. Those questions used to exist only inside the grid: a box in
// 6px type, its options rows that didn't look clickable, floating over the
// lessons next to it, with a grey count at the top of the page saying how many
// there were but not where. On a real 7A week that was four boxes across three
// days.
//
// So they are asked here, above the sheet, each as a card with the day and
// time and one button per option. The boxes in the grid still work; this is
// the same decision, made somewhere it can be seen.
//
// A question that appears twice is asked once. The language block on Monday
// and the one on Wednesday offer the same five options, and a child who reads
// German reads it on both days — so an answer applies to every slot with the
// same options, matched by subject and teacher. If a week really does differ,
// "ändra val" on either box in the grid reopens just that one.

import { slotsOf, type Lesson, type Schedule } from "@/types/schedule";
import { say, type Glossary } from "@/lib/glossary";

/** One slot's answer: keep one lesson, or keepId null to keep them all. */
export type Decision = { weekId: string; dayId: string; start: string; keepId: string | null };

type OpenSlot = { weekId: string; dayId: string; when: string; start: string; options: Lesson[] };

const SEP = " · ";
const sameAs = (l: Lesson) => `${l.subject.trim().toLowerCase()}|${(l.teacher ?? "").trim().toLowerCase()}`;

function openQuestions(schedule: Schedule): { key: string; slots: OpenSlot[] }[] {
  const groups: { key: string; slots: OpenSlot[] }[] = [];
  const weeks = schedule.weeks.length;
  for (const week of schedule.weeks) {
    for (const day of week.days) {
      for (const slot of slotsOf(day, true)) {
        if (slot.length < 2 || slot.every((l) => l.resolved)) continue;
        const end = slot.map((l) => l.end).filter(Boolean).sort().at(-1);
        const when = `${weeks > 1 && week.label ? `${week.label}, ` : ""}${day.name} ${slot[0].start}${end ? `–${end}` : ""}`;
        const key = slot.map(sameAs).sort().join("||");
        const open = { weekId: week.id, dayId: day.id, when, start: slot[0].start, options: slot };
        const group = groups.find((g) => g.key === key);
        if (group) group.slots.push(open);
        else groups.push({ key, slots: [open] });
      }
    }
  }
  return groups;
}

export default function ChoicesPanel({
  schedule,
  glossary,
  onDecide,
}: {
  schedule: Schedule;
  glossary: Glossary;
  onDecide: (decisions: Decision[]) => void;
}) {
  const questions = openQuestions(schedule);
  if (questions.length === 0) return null;

  return (
    <section className="choices no-print" aria-labelledby="choices-heading">
      <div className="choices-head">
        <h2 id="choices-heading">Välj vilka lektioner som gäller</h2>
        <span className="choices-count">
          {questions.length === 1 ? "1 val kvar" : `${questions.length} val kvar`}
        </span>
      </div>
      <p className="choices-intro">
        Skolan har skrivit flera alternativ på samma tid. Välj det som gäller för ditt barn — eller behåll
        alla, till exempel när lektionerna växlar varannan vecka.
      </p>

      <div className="choice-list">
        {questions.map(({ key, slots }) => {
          const options = slots[0].options;
          const decideAll = (pick: Lesson | null) =>
            onDecide(
              slots.map((s) => ({
                weekId: s.weekId,
                dayId: s.dayId,
                start: s.start,
                keepId: pick ? (s.options.find((o) => sameAs(o) === sameAs(pick))?.id ?? null) : null,
              })),
            );
          return (
            <div className="choice-card" key={key} role="group" aria-label={slots.map((s) => s.when).join(" och ")}>
              <p className="choice-when">{slots.map((s) => s.when).join(" och ")}</p>
              {slots.length > 1 && (
                <p className="choice-note">Samma alternativ {slots.length === 2 ? "båda gångerna" : `alla ${slots.length} gångerna`} — valet gäller alla.</p>
              )}
              <div className="choice-options">
                {options.map((o) => {
                  const detail = [o.room, say(o.teacher, glossary.teachers), o.note].filter(Boolean).join(SEP);
                  const tint = glossary.colors?.[o.subject.trim()];
                  return (
                    <button key={o.id} type="button" className="choice-opt" onClick={() => decideAll(o)}>
                      {tint && <span className="choice-dot" style={{ background: tint }} aria-hidden />}
                      <span className="choice-subject">{say(o.subject, glossary.subjects) ?? o.subject}</span>
                      {detail && <span className="choice-detail">{detail}</span>}
                    </button>
                  );
                })}
                <button type="button" className="choice-keep" onClick={() => decideAll(null)}>
                  {options.length === 2 ? "Behåll båda" : `Behåll alla ${options.length}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
