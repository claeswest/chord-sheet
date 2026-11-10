import { compressImage } from "@clavos/core/image";

// One AI background, from the song to a compressed image ready to store.
// Shared by the style panel's Generate button and the editor's one-click
// banner, so the two can't drift apart in how they ask, compress or fail.

export type BackgroundResult =
  | { ok: true; image: string; prompt: string }
  | { ok: false; error: string };

export async function generateBackground(input: {
  title: string;
  artist: string;
  lyrics: string;
  bgStyle: string;
  /** Where the request was started, for the activity log only. */
  via?: "banner";
}): Promise<BackgroundResult> {
  try {
    const res = await fetch("/api/ai/background", {
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
            : (data.error ?? "Image generation failed"),
      };
    }
    if (!data.image) return { ok: false, error: data.error ?? "No image returned" };
    return { ok: true, image: await compressImage(data.image), prompt: data.prompt ?? "" };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "Network error" };
  }
}
