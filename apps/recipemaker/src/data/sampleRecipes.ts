import { emptyContent, type Recipe } from "@/types/recipe";

// Sample recipes for the landing page. Real enough to be worth reading — a
// lorem-ipsum recipe undersells the product, since the whole pitch is that a
// recipe should look like something you'd keep.

function make(
  id: string,
  title: string,
  description: string,
  meta: { servings?: number; prep?: number; cook?: number; source?: string },
  ingredients: [number | null, string, string, string?][],
  steps: string[],
): Recipe {
  return {
    id,
    title,
    description,
    servings: meta.servings ?? null,
    prepMinutes: meta.prep ?? null,
    cookMinutes: meta.cook ?? null,
    source: meta.source ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      ...emptyContent(),
      ingredientGroups: [
        {
          id: "g1",
          heading: "",
          items: ingredients.map(([quantity, unit, name, note], i) => ({
            id: `${id}-i${i}`,
            quantity,
            unit,
            name,
            ...(note ? { note } : {}),
          })),
        },
      ],
      stepGroups: [
        {
          id: "s1",
          heading: "",
          items: steps.map((text, i) => ({ id: `${id}-t${i}`, text })),
        },
      ],
      notes: [],
    },
  };
}

export const PANCAKES = make(
  "pannkakor",
  "Mormors pannkakor",
  "The thin Swedish kind. The batter wants to rest — that's the whole trick.",
  { servings: 4, prep: 10, cook: 20, source: "Mormor Karin" },
  [
    [3, "dl", "plain flour"],
    [0.5, "tsp", "salt"],
    [6, "dl", "milk"],
    [3, "", "eggs", "lightly beaten"],
    [50, "g", "butter", "melted"],
  ],
  [
    "Whisk the flour, salt and half the milk to a smooth batter.",
    "Add the rest of the milk and the eggs. Stir in the melted butter.",
    "Let it rest 30 minutes — this is what makes them thin.",
    "Fry thin in a hot buttered pan until golden at the edges.",
  ],
);

export const SOUP = make(
  "soup",
  "Ärtsoppa",
  "Thursday soup. Better the next day, as everyone's grandmother insisted.",
  { servings: 6, prep: 15, cook: 120 },
  [
    [500, "g", "yellow peas", "soaked overnight"],
    [1, "", "onion", "chopped"],
    [300, "g", "smoked pork"],
    [1, "tsp", "dried marjoram"],
    [null, "", "salt", "to taste"],
  ],
  [
    "Drain the peas and bring to the boil in fresh water. Skim.",
    "Add the pork, onion and marjoram. Simmer until the peas collapse.",
    "Lift out the pork, slice, and return it to the pot.",
  ],
);

export const BUNS = make(
  "saffransbullar",
  "Saffransbullar",
  "Only at Christmas, and only with this much saffron.",
  { servings: 24, prep: 40, cook: 12 },
  [
    [1, "g", "saffron"],
    [150, "g", "butter"],
    [5, "dl", "milk"],
    [50, "g", "fresh yeast"],
    [1.5, "dl", "caster sugar"],
  ],
  [
    "Melt the butter, add the milk, and warm to finger temperature.",
    "Crumble in the yeast, then the saffron, sugar and flour.",
    "Prove, shape, prove again, and bake hot and short.",
  ],
);
