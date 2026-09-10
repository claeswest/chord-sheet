"use client";

// A setting with two states.
//
// Both of the sheet's switches were pills with aria-pressed, which put them in
// the same shape as every action on the page — and switched on they filled
// black, which is the shape this app keeps for its primary button. A setting
// that looks like a command gets read as one.
//
// A real <input type="checkbox">, not a div wearing the part: space toggles
// it, the label is clickable because it wraps the input, and a screen reader
// says "checkbox, checked" rather than leaving the state to be inferred from
// a colour.

export default function Check({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  /** Shown under the label where there is room for it. */
  hint?: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="inkcheck">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="inkcheck-text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
