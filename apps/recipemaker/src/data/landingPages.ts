// Search landing pages.
//
// One page per thing people actually type, not one page per keyword we'd like
// to rank for. The difference matters: a set of near-identical pages with the
// words swapped is a doorway, and Google has been demoting those for years.
// Every page here answers a different question, shows a different recipe, and
// says something the others don't.
//
// The rule for adding one: if you can't write three honest FAQ answers that
// would be wrong on the other pages, it isn't a separate page.
//
// Two slugs and titles use American spelling — "digitize", "organizer" —
// while the prose stays British like the rest of the site. That looks
// inconsistent because it is, deliberately: those two words ARE the query, and
// most English-speaking people searching for them type them that way. House
// style loses to the search box on exactly the words being searched for, and
// nowhere else.

import { HEIRLOOM, NORDIC, BOTANICAL, type CanvasStyle } from "@/lib/canvasStyle";
import { PANCAKES, SOUP, BUNS } from "@/data/sampleRecipes";
import type { Recipe } from "@/types/recipe";

export type LandingPage = {
  slug: string;
  /** <title>. Front-loaded, because that's what shows in a result. */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  /** The paragraph under the h1. Speaks to the search, not to the product. */
  intro: string;
  /** Above the paste box — tells them what to paste, in their terms. */
  tryKicker: string;
  tryTitle: string;
  /** Three things that matter to this particular visitor. */
  points: [string, string][];
  faq: [string, string][];
  sample: { recipe: Recipe; style: CanvasStyle };
};

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "recipe-card-maker",
    metaTitle: "Recipe Card Maker — make a recipe card you'd want to keep",
    metaDescription:
      "Paste any recipe and get a clean, printable recipe card. Choose the look, print it, or keep it in your own recipe book. Free to start.",
    h1: "Make a recipe card worth keeping",
    intro:
      "Most recipe cards are a template with your words dropped in. This makes a card that suits the recipe — the colours and type follow what you're cooking — while the ingredients still line up and the steps are still numbered, which is what actually matters at the worktop.",
    tryKicker: "Try it now",
    tryTitle: "Paste a recipe, get a card",
    points: [
      ["Made for one recipe, not for all of them", "A midweek soup and a Christmas bun shouldn't come out looking identical."],
      ["Prints properly", "Sized for a page or a card, with the method still readable at arm's length."],
      ["Yours afterwards", "The card goes in your library, where you can change it any time — it isn't an image you have to redo."],
    ],
    faq: [
      ["Can I print the card?", "Yes. Every recipe has a print view sized for paper, and the free tier prints with a small credit at the foot."],
      ["Do I have to type the recipe out?", "No. Paste the text from wherever it is now, and it comes back structured. Photographs of a card or a page work too, once you have an account."],
      ["Can I change the design afterwards?", "Yes — the look is a property of the recipe, not something baked into an exported picture. Change it in ten years and it re-renders."],
    ],
    sample: { recipe: PANCAKES, style: HEIRLOOM },
  },
  {
    slug: "family-cookbook-maker",
    metaTitle: "Family Cookbook Maker — collect the recipes worth keeping",
    metaDescription:
      "Gather your family's recipes into one book: paste or photograph them, keep the handwriting's wording, and print it. Free to start.",
    h1: "Make a family cookbook",
    intro:
      "The recipes worth collecting are rarely typed anywhere. They're on index cards, in handwriting you recognise, in a tin that only one person in the family has. This is for getting them somewhere they won't fade — one recipe at a time, in the words they were written in.",
    tryKicker: "Start with one",
    tryTitle: "Paste a recipe from the family",
    points: [
      ["One at a time", "A cookbook is finished by starting, not by planning. Add the one you cook most and the rest follows."],
      ["The wording survives", "The importer copies quantities and phrasing as written rather than tidying them into house style — \"a knob of butter\" stays a knob of butter."],
      ["Grouped how you like", "Collections for Christmas, for baking, for the ones from a particular person."],
    ],
    faq: [
      ["What about recipes only on paper?", "Photograph the card or the page. The text comes back typed up and editable, including handwriting, as long as the writing is legible to you."],
      ["Can I give the book to someone?", "You can print it, and you can share any recipe as a link that works without an account."],
      ["Will it change the recipe?", "It shouldn't, and it's built not to: it copies quantities verbatim. There's a separate checker you can run yourself if you want a second opinion on something that looks off."],
    ],
    sample: { recipe: BUNS, style: NORDIC },
  },
  {
    slug: "digitize-handwritten-recipes",
    metaTitle: "Digitize Handwritten Recipes — photograph a card, keep the recipe",
    metaDescription:
      "Digitize handwritten recipe cards: photograph one and get an editable, searchable recipe page. The wording is copied as written. Free to start.",
    h1: "Get handwritten recipes off paper",
    intro:
      "Index cards fade, get splashed, and go missing in house moves. Photographing them is the easy part; the tedious part is typing them all in. This does the typing — you photograph the card, it comes back as a recipe you can search, print, and correct where the camera misread.",
    tryKicker: "Try it with text first",
    tryTitle: "Paste a recipe you already have typed",
    points: [
      ["Copies, doesn't rewrite", "Quantities come across as written. An importer that quietly \"fixes\" 2 teaspoons to 2 tablespoons has destroyed the recipe."],
      ["You get to check it", "Everything lands in an editor, not in a black box. A second pass can flag quantities that look wrong and tell you why."],
      ["Readable afterwards", "Big type, numbered steps, and a screen that stays awake while your hands are covered."],
    ],
    faq: [
      ["Does it read handwriting?", "Usually, if you can read it. Photograph the card straight on, one recipe per picture, in decent light."],
      ["What if it gets something wrong?", "Fix it in the editor — it's a normal recipe from that point. Nothing is locked."],
      ["Do I need an account to photograph one?", "For photographs, yes. Pasted text you can try here and now, without one."],
    ],
    sample: { recipe: SOUP, style: BOTANICAL },
  },
  {
    slug: "print-recipe-cards",
    metaTitle: "Print Recipe Cards — printable recipes that stay readable",
    metaDescription:
      "Turn any recipe into a printable card or page, sized for paper and readable while you cook. Paste a recipe and see it. Free to start.",
    h1: "Print recipes that are actually readable",
    intro:
      "A recipe printed from a website is four pages of navigation, a life story and an advert. This prints the recipe: what goes in, what to do, and how long — laid out so you can follow it from across a worktop without touching the paper.",
    tryKicker: "See it first",
    tryTitle: "Paste a recipe you'd like to print",
    points: [
      ["Nothing but the recipe", "No headers, no adverts, no half-page photograph of somebody's kitchen."],
      ["Set for reading, not for screens", "18px body type and generous spacing, because it's read at arm's length with flour on your hands."],
      ["The same page every time", "Print it again next year and it comes out the same, because the layout belongs to the recipe."],
    ],
    faq: [
      ["What paper size?", "It prints to whatever your printer is set to; the layout is sized for a standard page rather than a fixed card."],
      ["Is there a watermark?", "The free tier prints with a small credit at the foot. Paid plans print clean."],
      ["Can I print several at once?", "Not as one job yet — recipes print one at a time."],
    ],
    sample: { recipe: PANCAKES, style: HEIRLOOM },
  },
  {
    slug: "recipe-organizer",
    metaTitle: "Recipe Organizer — find the one you actually cook",
    metaDescription:
      "Keep your recipes in one place, grouped how you think about them, and findable in seconds. Paste one and see. Free to start.",
    h1: "Keep your recipes somewhere you can find them",
    intro:
      "Most people's recipes are spread across a screenshot folder, three bookmarks, a note on their phone and a message from a friend. The problem isn't storage — it's that none of it is findable when you're hungry and it's half past six.",
    tryKicker: "Try it now",
    tryTitle: "Paste one of the scattered ones",
    points: [
      ["Grouped how you think", "Collections for weeknights, for baking, for Christmas — a recipe can sit in more than one."],
      ["Everything in the same shape", "Whatever it came from, it ends up structured: ingredients, steps, times."],
      ["Still there in ten years", "Recipes live in your account, not in a browser's storage or a phone that gets replaced."],
    ],
    faq: [
      ["Can a recipe be in two collections?", "Yes. Most useful ones are."],
      ["What happens to the original link?", "It's kept as the source, so you can always go back to where it came from."],
      ["Does it work on a phone?", "Yes, and there's a cook view meant for exactly that — big type, and the screen stays awake."],
    ],
    sample: { recipe: SOUP, style: BOTANICAL },
  },
];

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
