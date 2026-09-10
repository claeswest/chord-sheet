"use client";

// Ink-saving, as a checkbox.
//
// It was a pill with aria-pressed, which put it in the same shape as every
// action on the page — and switched on it became a black pill, the shape this
// app reserves for the primary button. A setting that looks like a command is
// read as a command.
//
// A real <input type="checkbox">, not a div pretending: space toggles it, the
// label is clickable because it wraps the input, and a screen reader says
// "checkbox, checked" rather than leaving the state to be inferred.

export default function InkToggle({
  on,
  onChange,
  hint,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  /** Shown under the label where there is room for it. */
  hint?: string;
}) {
  return (
    <label className="inkcheck">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="inkcheck-text">
        Bläcksnål utskrift
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
