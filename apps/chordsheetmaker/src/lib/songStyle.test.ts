import { describe, it, expect } from "vitest";
import { DEFAULT_STYLE, isLightBg, textHalo, type SongStyle } from "./songStyle";

const onPicture = (extra: Partial<SongStyle> = {}): SongStyle => ({
  ...DEFAULT_STYLE,
  backgroundImage: "/picture.jpg",
  ...extra,
});

/** The strongest alpha in a text-shadow, as a number. */
const strongest = (shadow: string | undefined) =>
  Math.max(...[...(shadow ?? "").matchAll(/,([\d.]+)\)/g)].map((m) => Number(m[1])));

describe("textHalo", () => {
  it("is not there without a picture", () => {
    expect(textHalo(DEFAULT_STYLE)).toBeUndefined();
    expect(textHalo({ ...DEFAULT_STYLE, overlayOpacity: 0 })).toBeUndefined();
  });

  it("is not there at the usual wash, or a stronger one", () => {
    expect(textHalo(onPicture())).toBeUndefined(); // no wash chosen: the default, a half
    expect(textHalo(onPicture({ overlayOpacity: 0.5 }))).toBeUndefined();
    expect(textHalo(onPicture({ overlayOpacity: 0.55 }))).toBeUndefined();
    expect(textHalo(onPicture({ overlayOpacity: 1 }))).toBeUndefined();
  });

  it("fades in as the wash is turned down, with no jump", () => {
    const at = (wash: number) => strongest(textHalo(onPicture({ overlayOpacity: wash })));
    expect(at(0)).toBeCloseTo(0.85);
    expect(at(0.25)).toBeCloseTo(0.43, 1);
    expect(at(0.4)).toBeGreaterThan(0);
    expect(at(0.4)).toBeLessThan(at(0.25));
    expect(at(0.49)).toBeLessThan(0.05);
  });

  it("is light on a light page and dark on a dark one", () => {
    expect(textHalo(onPicture({ overlayOpacity: 0, background: "#ffffff" }))).toContain("rgba(255,255,255,");
    expect(textHalo(onPicture({ overlayOpacity: 0, background: "#161616" }))).toContain("rgba(0,0,0,");
  });

  it("puts up with a wash outside 0 to 1", () => {
    expect(textHalo(onPicture({ overlayOpacity: 3 }))).toBeUndefined();
    expect(strongest(textHalo(onPicture({ overlayOpacity: -1 })))).toBeCloseTo(0.85);
  });
});

describe("isLightBg", () => {
  it("goes by how bright a colour looks", () => {
    expect(isLightBg("#ffffff")).toBe(true);
    expect(isLightBg("#f7f2e9")).toBe(true);
    expect(isLightBg("#161616")).toBe(false);
    expect(isLightBg("#1c4a94")).toBe(false);
  });
  it("takes a missing or odd colour for the white default", () => {
    expect(isLightBg(undefined)).toBe(true);
    expect(isLightBg("#fff")).toBe(true);
  });
});
