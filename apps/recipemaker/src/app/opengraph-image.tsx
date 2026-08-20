import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The card people see before they see the site: pasted into WhatsApp, iMessage,
// Facebook, Slack. Until this existed, a shared link was a blank rectangle —
// which matters more here than most places, since sharing a recipe is the
// thing the product is for.
//
// Drawn in code rather than generated as a picture, so it never drifts from
// the brand and the words stay sharp and real at any size.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RecipeBookMaker — your recipes, beautifully kept";

// Fraunces carries every heading on the site. Without it this card would be
// set in Satori's fallback sans and would look like somebody else's product.
// Subset to Latin, which is all the card needs — 70KB rather than half a meg.
const font = (file: string) => join(process.cwd(), "assets", file);

const PAPER = "#fdf2e3";
const RAISED = "#fffcf6";
const INK = "#191410";
const MUTED = "#5d5147";
const FAINT = "#9b8d80";
const ACCENT = "#b4432a";
const RULE = "#eadfcd";
const HERB = "#2f6b4f";

/** One ingredient row: a quantity, then the thing itself. */
function Ingredient({ qty, width }: { qty: string; width: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
      <div style={{ display: "flex", width: 64, fontSize: 17, color: HERB }}>{qty}</div>
      <div style={{ display: "flex", height: 11, width, borderRadius: 6, background: "#e4dccf" }} />
    </div>
  );
}

export default async function OgImage() {
  const [bold, regular] = await Promise.all([
    readFile(font("Fraunces-Bold.ttf")),
    readFile(font("Fraunces-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: PAPER,
          padding: 64,
          fontFamily: "Fraunces",
          fontWeight: 400,
        }}
      >
        {/* Left: who this is and what it promises */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingRight: 56,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: INK, marginBottom: 34 }}>
            Recipe<span style={{ color: ACCENT }}>Book</span>Maker
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.1,
            }}
          >
            <span>Your recipes,</span>
            <span style={{ color: ACCENT }}>beautifully kept</span>
          </div>
          <div style={{ display: "flex", fontSize: 25, color: MUTED, marginTop: 30 }}>
            Paste one in and get a page worth cooking from
          </div>
        </div>

        {/* Right: the thing itself, near enough. Ingredients line up, steps are
            numbered — the two promises the product actually makes. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 400,
            borderRadius: 24,
            background: RAISED,
            border: `2px solid ${RULE}`,
            padding: "38px 40px",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: INK }}>Grandma&apos;s pancakes</div>
          <div style={{ display: "flex", fontSize: 16, color: FAINT, marginTop: 8 }}>
            Serves 4 · 20 minutes
          </div>
          <div
            style={{ display: "flex", height: 3, width: 56, background: ACCENT, margin: "24px 0 26px" }}
          />

          <Ingredient qty="250 g" width={172} />
          <Ingredient qty="3 dl" width={210} />
          <Ingredient qty="2" width={140} />

          <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
            {[1, 2].map((n) => (
              <div key={n} style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    background: INK,
                    color: RAISED,
                    fontSize: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 11,
                    width: n === 1 ? 232 : 190,
                    borderRadius: 6,
                    background: "#e4dccf",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      // Both weights, because one weight means everything shouts. The
      // supporting lines are the ones that have to stop shouting.
      fonts: [
        { name: "Fraunces", data: regular, style: "normal", weight: 400 },
        { name: "Fraunces", data: bold, style: "normal", weight: 700 },
      ],
    },
  );
}
