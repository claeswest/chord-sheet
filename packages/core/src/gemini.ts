// Centralized Gemini configuration + a resilient fetch wrapper.
//
// Why this file exists:
//  1. The model name used to be hardcoded in 5 route files. When Google
//     retired gemini-2.0-flash, all 5 broke. Now the model lives in ONE place.
//  2. The raw fetch() calls had no timeout or retry, so a single transient
//     Gemini blip failed a user action at a critical moment (search/import).
//     geminiFetch() adds a timeout and one automatic retry on transient errors.

/** Default text model for search, parse, OCR and style. */
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

/** Image-generation model for song backgrounds. */
export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

/** Build the generateContent endpoint URL for a given model. */
export function geminiUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

interface GeminiFetchOptions {
  /** Per-attempt timeout in milliseconds. Default 25s. */
  timeoutMs?: number;
  /** Number of automatic retries on transient errors. Default 1. */
  retries?: number;
}

/**
 * POST a JSON body to a Gemini endpoint with a timeout and automatic retry.
 *
 * Retries once (by default) on network errors, request timeouts, and
 * transient server responses (429 / 5xx). Does NOT retry on 4xx client
 * errors (e.g. 400/404) since those won't succeed on a second attempt.
 */
export async function geminiFetch(
  url: string,
  body: unknown,
  opts: GeminiFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 25_000, retries = 1 } = opts;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Retry transient server errors, but return client errors immediately.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await delay(400 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) {
        await delay(400 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  // Unreachable, but satisfies the type checker.
  throw lastError ?? new Error("geminiFetch failed");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
