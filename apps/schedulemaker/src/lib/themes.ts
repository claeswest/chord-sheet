// The styles a sheet can be printed in.
//
// Themes set colours and display fonts. Card fitting is repeated when fonts load.
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

// `dot` is the swatch that stands for the style, so it has to tell the eight
// apart, not just repeat each accent. Accents alone gave three blues and two
// browns — Klassisk #79502e and Lekfull #87522b could not be told apart at 26px.
// So Skymning is its dark paper and Lekfull its sunny yellow: each is the
// colour that most says what that style is.
export type Theme = { id: string; name: string; dot: string; note: string };

export const THEMES: Theme[] = [
  { id: "", name: "Papper", dot: "#3b5bdb", note: "Rent och luftigt med blå detaljer. Passar alla." },
  { id: "chalk", name: "Krita", dot: "#c08a5e", note: "Varmt och lugnt, som ett gammalt klassrum." },
  { id: "dusk", name: "Skymning", dot: "#1c2148", note: "Mörkt och mysigt, med ljusa lektionsrutor." },
  { id: "meadow", name: "Äng", dot: "#2f7d46", note: "Mjuka gröna toner – lugnt för ögat." },
  { id: "candy", name: "Godis", dot: "#d6336c", note: "Rosa och rundat, för den som gillar det sött." },
  { id: "schoolbook", name: "Skolbok", dot: "#245e85", note: "Ljusblått med extra tydliga ämnesrubriker." },
  { id: "classic", name: "Klassisk", dot: "#79502e", note: "Elfenbensvitt och klassiska rubriker, lite som en gammal bok." },
  { id: "playful", name: "Lekfull", dot: "#f2c14e", note: "Solgult med handskriven rubrik – glatt och busigt." },
];
