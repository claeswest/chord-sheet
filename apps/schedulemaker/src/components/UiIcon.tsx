// Icons for the app's own buttons — not the sheet's. Stroked in currentColor
// so a button's text colour is the icon's, disabled state included.

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

/** A printer: paper in, paper out. */
export function PrintIcon() {
  return (
    <svg {...base}>
      <path d="M7 9V4h10v5" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M7 14h10v6H7z" />
    </svg>
  );
}

/** An arrow coming round to where it started. */
export function RestartIcon() {
  return (
    <svg {...base}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  );
}
