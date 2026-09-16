// The mark: a school day, drawn the way the sheet draws one.
//
// Three columns of lessons. The morning ones start together and end at
// different times; a band across for lunch; the afternoon ones start together
// again and end at different times. That is the proportional grid this app
// prints, reduced to eight shapes — which is why it is this and not a tick or
// a calendar page, both of which say "some app with dates in it".
//
// The tints are the sheet's own pale subject colours, the band is the blue rule
// the sheet draws under its day names, and the tile is the ink of the page's
// one button. Kept in step with src/app/icon.svg, which is the same drawing as
// a file so Next can serve it as the favicon.

const COLS = [6, 13.33, 20.67];
const COL_W = 5.33;
const MORNING: [number, number][] = [[6, 13], [6, 10.5], [6, 14]];
const AFTERNOON: [number, number][] = [[18, 26], [18, 23], [18, 21]];
const TINTS = ["#f6b8cf", "#b8e6c4", "#c9c2f5", "#fbe39a", "#f6b8cf", "#a9d4f5"];

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" rx="8" fill="#1a1a1a" />
      <rect x="6" y="15" width="20" height="2" rx="1" fill="#7c8cff" />
      {COLS.map((x, i) => (
        <g key={x}>
          <rect x={x} y={MORNING[i][0]} width={COL_W} height={MORNING[i][1] - MORNING[i][0]} rx="1.4" fill={TINTS[i]} />
          <rect x={x} y={AFTERNOON[i][0]} width={COL_W} height={AFTERNOON[i][1] - AFTERNOON[i][0]} rx="1.4" fill={TINTS[i + 3]} />
        </g>
      ))}
    </svg>
  );
}

/** The name, set as a name. Used where the site says who it is. */
export const SITE_NAME = "Fixa schemat";
