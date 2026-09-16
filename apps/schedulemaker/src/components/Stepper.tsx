"use client";

// Where you are: Ladda upp → Redigera → Skriv ut.
//
// The three stages always existed, but only as the page changing under you.
// The editor and the finished sheet look alike — both are the sheet — so
// nothing said which one you were in, that there was a step after this one,
// or that the step before it was done. A row of three answers all of that at a
// glance, and it is the same row on the front page, so the shape of the whole
// job is visible before the photo is even chosen.
//
// Steps 2 and 3 are also a way to move between them. Step 1 is not: going back
// to it means discarding the schedule, and that has its own button that asks
// first. Moving forward is refused while a choice is still open, with the
// reason on the step itself — the same rule the "Nästa" button follows.
//
// Fixed colours rather than the style's: once a schedule exists the page
// carries its data-theme, and a stepper that turned lilac on Skymning would be
// decorating the app's controls with the sheet's paint.

export type StepNo = 1 | 2 | 3;

const STEPS: { n: StepNo; label: string }[] = [
  { n: 1, label: "Ladda upp" },
  { n: 2, label: "Redigera" },
  { n: 3, label: "Skriv ut" },
];

export default function Stepper({
  current,
  onGo,
  blocked,
}: {
  current: StepNo;
  /** Omitted where the steps are only shown, not used (the front page). */
  onGo?: (step: StepNo) => void;
  /** A step that can't be reached yet, and why. */
  blocked?: { step: StepNo; reason: string };
}) {
  return (
    <nav className="stepper no-print" aria-label="Steg">
      <ol>
        {STEPS.map(({ n, label }) => {
          const state = n < current ? "done" : n === current ? "current" : "todo";
          const isBlocked = blocked?.step === n;
          const canGo = !!onGo && n !== current && n !== 1 && !isBlocked;
          const content = (
            <>
              <span className="stepper-no" aria-hidden>
                {state === "done" ? (
                  <svg viewBox="0 0 12 12" width="12" height="12">
                    <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  n
                )}
              </span>
              <span className="stepper-label">{label}</span>
            </>
          );
          return (
            <li key={n} className={`stepper-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
              {canGo ? (
                <button type="button" className="stepper-item" onClick={() => onGo(n)}>
                  {content}
                </button>
              ) : (
                <span
                  className={`stepper-item ${isBlocked ? "blocked" : ""}`}
                  title={isBlocked ? blocked.reason : undefined}
                >
                  {content}
                  {/* Said, not just hovered: there is no hover on a phone. */}
                  {isBlocked && <span className="visually-hidden"> — {blocked.reason}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
