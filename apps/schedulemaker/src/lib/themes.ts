// The styles a sheet can be printed in.
//
// Each is six custom properties and nothing else — no layout, no type, no
// second stylesheet to keep in step. That is the whole reason there can be a
// row of them: a style cannot break the sheet, because a style cannot reach
// the parts that could break.
//
// The subject tints are not in here. They belong to the glossary, one hue per
// subject spaced by the golden angle, so they follow the schedule from style
// to style — the pink one stays maths whichever paper it is printed on.
//
// Nor is ink-saving. It used to sit in this list as a sixth style, which asked
// the wrong question: whether to spend a cartridge on a timetable is a fact
// about your printer, not about your taste, and someone who liked Krita and
// owned a mono laser had to give one up for the other. It is a switch over
// the top of any style now — and it wins on colour, since printing a dark
// paper to save ink is the one combination that makes no sense at all. What
// survives it is the style's letterform.

export type Theme = { id: string; name: string; dot: string; note: string };

export const THEMES: Theme[] = [
  { id: "", name: "Papper", dot: "#3b5bdb", note: "Vitt och blått, rundad stil. Standard." },
  { id: "chalk", name: "Krita", dot: "#c08a5e", note: "Varmt papper, dämpade toner, antikva." },
  { id: "dusk", name: "Skymning", dot: "#7c8cff", note: "Mörkt papper, ljus text, humanistisk stil." },
  { id: "meadow", name: "Äng", dot: "#2f7d46", note: "Grönt och lugnt, humanistisk stil." },
  { id: "candy", name: "Godis", dot: "#d6336c", note: "Rosa och rundat, för den som vill." },
];
