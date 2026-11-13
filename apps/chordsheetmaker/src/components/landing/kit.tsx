// The handful of pieces every paper-and-ink page is built from. Colours and
// the serif are tokens in globals.css (--color-paper, --color-ink,
// --color-rule, --color-chord, --font-display).

import { Fragment, type ReactNode } from "react";

/**
 * A word with its chord over it — these pages' one ornament, and the
 * product's own idiom.
 *
 * The chord is drawn by CSS from `data-chord`, not written into the page. As
 * text it would be part of the heading: a search engine would read
 * "GTurn any Dsong", and a screen reader would say it.
 */
export function Chorded({ chord, children }: { chord: string; children: ReactNode }) {
  return (
    <span className="chorded" data-chord={chord}>
      {children}
    </span>
  );
}

/**
 * A line of text with chords placed over it the way a chart would have them:
 * one on the first word, one where the phrase turns. For headings whose words
 * come from data, where nobody can place the chords by hand.
 */
export function ChordedLine({ text, chords }: { text: string; chords: [string, string] }) {
  const words = text.split(" ");
  const turn = words.length >= 3 ? Math.floor(words.length / 2) : -1;
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {i === 0 ? <Chorded chord={chords[0]}>{w}</Chorded>
            : i === turn ? <Chorded chord={chords[1]}>{w}</Chorded>
            : w}
        </Fragment>
      ))}
    </>
  );
}

/** The small label over a section's heading. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`${EYEBROW} ${className}`}>{children}</p>;
}

export const EYEBROW = "font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chord";

/** Section headings. */
export const H2 = "font-display font-medium text-4xl sm:text-5xl tracking-[-0.02em] text-ink";

/** A heading set like a line on a chart: the tall leading is the room the chords sit in. */
export const CHART_LEADING = "leading-[1.42]";

// One set of buttons: ink for the thing we want pressed, a hairline for
// everything else, paper for a button that sits on ink.
export const BTN = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors whitespace-nowrap";
export const BTN_INK = `${BTN} bg-ink text-paper hover:bg-stone-700`;
export const BTN_LINE = `${BTN} border border-ink/20 text-ink hover:border-ink/60`;
export const BTN_PAPER = `${BTN} bg-paper text-ink hover:bg-white`;
