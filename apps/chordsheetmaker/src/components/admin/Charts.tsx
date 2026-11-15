// The admin's two charts. Both are one series in one colour: there is no
// legend to read and no palette to tell apart. Every bar says its own value
// on hover or focus, and the same numbers are there as a table for a screen
// reader.

import type { ReactNode } from "react";

/**
 * A row of bars, oldest on the left. The last bar — the period still running
 * — is in ink, so "this week so far" is not mistaken for a finished week.
 */
export function Bars({
  values,
  labels,
  caption,
  height = 64,
  unit = "",
}: {
  values: number[];
  /** One per bar, for the tooltip and the table. */
  labels: string[];
  /** What the chart shows, for a screen reader. */
  caption: string;
  height?: number;
  unit?: string;
}) {
  const max = Math.max(1, ...values);
  const last = values.length - 1;
  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label={caption}>
        {values.map((v, i) => (
          <div key={i} tabIndex={0} className="group relative flex-1 h-full flex items-end outline-none">
            <div
              className={`w-full rounded-t-[3px] transition-opacity group-hover:opacity-70 group-focus:opacity-70 ${i === last ? "bg-ink" : "bg-chord"} ${v === 0 ? "opacity-25" : ""}`}
              // A zero still leaves a hairline, so an empty week reads as "none" rather than as a gap in the data.
              style={{ height: v === 0 ? 2 : `${Math.max(4, (v / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-paper group-hover:block group-focus:block">
              <span className="font-semibold tabular-nums">{v}{unit}</span>
              <span className="text-paper/70"> · {labels[i]}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between border-t border-rule pt-1 font-mono text-[10px] text-stone-500">
        <span>{labels[0]}</span>
        <span>{labels[last]}</span>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {values.map((v, i) => (
            <tr key={i}><th scope="row">{labels[i]}</th><td>{v}{unit}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Steps that narrow: a bar per step on one scale, with what share of the step
 * before it reached this one.
 */
export function Funnel({ steps }: { steps: { label: string; value: number; note?: ReactNode }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const share = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">{s.label}</span>
              <span className="flex items-baseline gap-2 shrink-0">
                {share !== null && (
                  <span className="font-mono text-[11px] text-stone-500" title="Share of the step above">{share}%</span>
                )}
                <span className="font-display text-xl leading-none tabular-nums text-ink">{s.value}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-paper-deep">
              <div className="h-2 rounded-full bg-chord" style={{ width: `${s.value === 0 ? 0 : Math.max(2, (s.value / max) * 100)}%` }} />
            </div>
            {s.note && <p className="mt-1 text-xs text-stone-500">{s.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
