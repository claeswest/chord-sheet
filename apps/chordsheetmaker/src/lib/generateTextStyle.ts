import { loadStyleFonts, type SongStyle } from "./songStyle";

// One AI text style — fonts, sizes and colours chosen from the song — ready to
// merge into a SongStyle. Shared by the style panel's "Style with AI" button
// and the editor's one-click "Style it", for the same reason
// generateBackground is: so the two can't drift apart in how they ask or fail.

export type TextStyleResult =
  | { ok: true; style: Partial<SongStyle>; theme: string }
  | { ok: false; error: string };

export async function generateTextStyle(input: {
  title: string;
  artist: string;
  lyrics: string;
}): Promise<TextStyleResult> {
  try {
    const res = await fetch("/api/ai/style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error:
          data.error === "rate_limited"
            ? "That was a few in a row — give it a minute and try again."
            : (data.error ?? "AI request failed"),
      };
    }
    if (!data.style) return { ok: false, error: "No style returned" };
    // Start the fonts loading now, so they are there when the style lands.
    loadStyleFonts(data.style);
    return { ok: true, style: data.style, theme: data.theme ?? "" };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "Network error" };
  }
}
