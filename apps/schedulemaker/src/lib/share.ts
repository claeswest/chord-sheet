// A schedule in a link, for the other parents in the class.
//
// Everyone in a class is sent the same sheet. One parent photographs it and
// spends the afternoon turning DLE into Denise; the other twenty-five should
// not have to. So the finished schedule can be sent on — and it travels in the
// link itself, in the part after the #.
//
// That part is the whole design. A browser never sends what follows the # to
// the server it is asking for the page, so this app still has no schedule, no
// log line with a school in it and no route that could leak one. "/api/read is
// the only route" stays true. The price is a long link, which is why the
// payload below is packed as tightly as it is.
//
// What goes, and what does not:
//
// - The class, the school, the days, times, subjects, teachers, rooms and
//   notes go. That is the paper every family in the class already has, plus
//   the names one of them typed in.
// - The banner does not. "Elins schema" is the one line that is about a child
//   rather than a class, and the person opening the link has a child of their
//   own to name.
// - The choices do not. That Elin reads German says nothing about what the
//   next child reads, and a sheet that arrives with four languages already set
//   aside would be wrong without looking wrong. Every option comes back as an
//   open question.
// - The style, the paper and the switches do not. Taste, and a fact about
//   somebody else's printer.

import {
  EMPTY_GLOSSARY,
  codesIn,
  withDefaultColors,
  withKnownNames,
  type Glossary,
} from "@/lib/glossary";
import type { Lesson, Schedule } from "@/types/schedule";

/** How a shared schedule sits in an address: `https://…/#s=<payload>`. */
const MARK = "#s=";

/**
 * Nothing a link carries may be larger than this.
 *
 * The link is written by whoever sent it, which is to say by anyone. A few
 * hundred bytes of deflate can unpack to megabytes, so the unpacked size is
 * capped while it is being read rather than after, and the counts below keep a
 * hand-made payload from asking the sheet to lay out ten thousand lessons.
 * A real upper-secondary week measured about 6 kB unpacked.
 */
const MAX_PACKED_CHARS = 40_000;
const MAX_UNPACKED_BYTES = 200_000;
const MAX_WEEKS = 4;
const MAX_DAYS = 10;
const MAX_LESSONS_PER_DAY = 60;
const MAX_NOTES = 30;
const MAX_TEXT = 500;

/** Raised for any link that cannot be opened. The message is for a parent. */
export class ShareError extends Error {}

const BROKEN = "Den här länken gick inte att läsa. Be om en ny – den kan ha kortats av på vägen.";
const TOO_OLD = "Den här webbläsaren är för gammal för att öppna ett delat schema. Prova en nyare.";

// The wire format. Short keys and lessons as arrays, because every character
// here is a character in a link somebody has to paste into a chat.
//
//   [start, end, subject, teacher, room, note] — trailing blanks dropped
type WireLesson = string[];
type Wire = {
  v: 1;
  t: string; // title
  s: string; // subtitle
  n: string[]; // notes
  w: { l: string; d: { n: string; l: WireLesson[] }[] }[];
  g: {
    t: Record<string, string>; // teacher code → name
    s: Record<string, string>; // subject code → name
    c: Record<string, string>; // subject code → colour, only where it isn't the default
  };
};

const uid = () => Math.random().toString(36).slice(2, 10);

/** The colours a schedule gets when nobody has chosen any. */
function defaultColors(schedule: Schedule): Record<string, string> {
  return withDefaultColors(EMPTY_GLOSSARY, codesIn(schedule).subjects).colors;
}

/** Only the entries for codes the schedule still uses. */
function only(map: Record<string, string>, codes: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const code of codes) {
    if (Object.hasOwn(map, code) && typeof map[code] === "string") out[code] = map[code];
  }
  return out;
}

function toWire(schedule: Schedule, glossary: Glossary): Wire {
  const codes = codesIn(schedule);
  const base = defaultColors(schedule);
  const colors = only(glossary.colors, codes.subjects);
  // The default colours are worked out from the schedule, so the other end can
  // work them out too. Sending thirty hex codes that say "the usual" would be a
  // fifth of the link.
  for (const code of Object.keys(colors)) if (colors[code] === base[code]) delete colors[code];

  return {
    v: 1,
    t: schedule.title,
    s: schedule.subtitle ?? "",
    n: schedule.notes.filter((n) => n.trim() !== ""),
    w: schedule.weeks.map((w) => ({
      l: w.label,
      d: w.days.map((d) => ({
        n: d.name,
        l: d.lessons.map((l) => {
          const row = [l.start, l.end, l.subject, l.teacher ?? "", l.room ?? "", l.note ?? ""];
          while (row.length > 3 && row[row.length - 1] === "") row.pop();
          return row;
        }),
      })),
    })),
    g: {
      // Stale entries are left behind on purpose: a teacher named for a lesson
      // that has since been deleted is a name with no business in the link.
      t: only(glossary.teachers, codes.teachers),
      s: only(glossary.subjects, codes.subjects),
      c: colors,
    },
  };
}

function text(v: unknown): string {
  return typeof v === "string" ? v.slice(0, MAX_TEXT) : "";
}

function list(v: unknown, max: number): unknown[] {
  if (!Array.isArray(v)) return [];
  if (v.length > max) throw new ShareError(BROKEN);
  return v;
}

/**
 * A code this app can safely use as a key.
 *
 * The glossary is three plain objects looked up by code, and a plain object
 * answers to "constructor" and "__proto__" whether or not anyone put them
 * there. No school has a subject by those names; a link that claims one was
 * made by hand, and is refused rather than repaired.
 */
function safeCode(code: string): boolean {
  return !(code in Object.prototype);
}

function names(v: unknown, codes: string[]): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  return only(
    Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, text(val)]),
    ),
    codes,
  );
}

function fromWire(data: unknown): { schedule: Schedule; glossary: Glossary } {
  if (!data || typeof data !== "object") throw new ShareError(BROKEN);
  const w = data as Record<string, unknown>;
  if (w.v !== 1) {
    // A link from a later version of this file, opened in a tab that has been
    // sitting since before it shipped.
    throw new ShareError("Den här länken är nyare än sidan du har öppen. Ladda om sidan och prova igen.");
  }

  const weeks = list(w.w, MAX_WEEKS)
    .map((wk) => {
      const week = (wk ?? {}) as Record<string, unknown>;
      const days = list(week.d, MAX_DAYS)
        .map((dy) => {
          const day = (dy ?? {}) as Record<string, unknown>;
          const lessons = list(day.l, MAX_LESSONS_PER_DAY)
            .map((row): Lesson | null => {
              const r = Array.isArray(row) ? row : [];
              const subject = text(r[2]).trim();
              const note = text(r[5]).trim();
              if (!subject && !note) return null;
              return {
                id: uid(),
                start: text(r[0]).trim(),
                end: text(r[1]).trim(),
                subject,
                teacher: text(r[3]).trim() || undefined,
                room: text(r[4]).trim() || undefined,
                note: note || undefined,
              };
            })
            .filter((l): l is Lesson => l !== null);
          return { id: uid(), name: text(day.n).trim(), lessons };
        })
        .filter((d) => d.name !== "" || d.lessons.length > 0);
      return { id: uid(), label: text(week.l).trim(), days };
    })
    .filter((wk) => wk.days.length > 0);

  if (weeks.length === 0) throw new ShareError(BROKEN);

  const schedule: Schedule = {
    // No heading: undefined gets the default banner, and the editor's
    // placeholder asks for the name that belongs there.
    title: text(w.t).trim(),
    subtitle: text(w.s).trim() || null,
    weeks,
    notes: list(w.n, MAX_NOTES).map((n) => text(n).trim()).filter(Boolean),
  };

  const codes = codesIn(schedule);
  if (![...codes.subjects, ...codes.teachers].every(safeCode)) throw new ShareError(BROKEN);

  const g = (w.g && typeof w.g === "object" ? w.g : {}) as Record<string, unknown>;
  const chosen = names(g.c, codes.subjects);
  // A colour ends up in a style attribute. Six hex digits, or blank for "no
  // fill" — nothing else gets that far.
  for (const code of Object.keys(chosen)) {
    if (chosen[code] !== "" && !/^#[0-9a-f]{6}$/i.test(chosen[code])) delete chosen[code];
  }

  const glossary = withKnownNames(
    {
      teachers: names(g.t, codes.teachers),
      subjects: names(g.s, codes.subjects),
      colors: { ...defaultColors(schedule), ...chosen },
    },
    codes.subjects,
  );

  return { schedule, glossary };
}

// ── Bytes ───────────────────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new ShareError(BROKEN);
  let bin: string;
  try {
    bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    throw new ShareError(BROKEN);
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Reads a stream to the end, giving up as soon as it is bigger than allowed. */
async function drain(stream: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new ShareError(BROKEN);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

function through(bytes: Uint8Array<ArrayBuffer>, t: TransformStream<Uint8Array, Uint8Array>) {
  return new Blob([bytes]).stream().pipeThrough(t);
}

/**
 * The part of the link that is the schedule.
 *
 * The first character says how the rest is packed: "1" is deflated, "0" is
 * not. Deflate roughly halves a timetable — the same five day names, the same
 * dozen codes — and every current browser has it built in; "0" is for the one
 * that does not, so that sharing degrades to a longer link instead of an error.
 */
export async function packSchedule(schedule: Schedule, glossary: Glossary): Promise<string> {
  const plain = new TextEncoder().encode(JSON.stringify(toWire(schedule, glossary)));
  if (typeof CompressionStream === "undefined") return "0" + toBase64Url(plain);
  const packed = await drain(
    through(plain, new CompressionStream("deflate-raw") as TransformStream<Uint8Array, Uint8Array>),
    MAX_UNPACKED_BYTES,
  );
  return "1" + toBase64Url(packed);
}

/** The reverse. Throws a ShareError, with a message fit to show, for anything else. */
export async function unpackSchedule(payload: string): Promise<{ schedule: Schedule; glossary: Glossary }> {
  if (payload.length < 2 || payload.length > MAX_PACKED_CHARS) throw new ShareError(BROKEN);
  const how = payload[0];
  const bytes = fromBase64Url(payload.slice(1));

  let plain: Uint8Array;
  if (how === "0") {
    plain = bytes;
  } else if (how === "1") {
    if (typeof DecompressionStream === "undefined") throw new ShareError(TOO_OLD);
    try {
      plain = await drain(
        through(bytes, new DecompressionStream("deflate-raw") as TransformStream<Uint8Array, Uint8Array>),
        MAX_UNPACKED_BYTES,
      );
    } catch (e) {
      // A link cut short by a chat app fails here, as a stream that never ends.
      throw e instanceof ShareError ? e : new ShareError(BROKEN);
    }
  } else {
    throw new ShareError(BROKEN);
  }
  if (plain.length > MAX_UNPACKED_BYTES) throw new ShareError(BROKEN);

  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plain));
  } catch {
    throw new ShareError(BROKEN);
  }
  return fromWire(data);
}

/** The whole address to send, for the page the app is open on. */
export function shareUrl(payload: string, base: string): string {
  return base.replace(/[#?].*$/, "") + MARK + payload;
}

/** The schedule part of an address's #…, or null when it has none. */
export function sharedIn(hash: string): string | null {
  return hash.startsWith(MARK) && hash.length > MARK.length ? hash.slice(MARK.length) : null;
}
