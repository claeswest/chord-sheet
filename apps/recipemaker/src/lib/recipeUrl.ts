// Fetching a recipe from a link.
//
// Two things make this more than a fetch call.
//
// The first is that most recipe sites already publish the recipe as
// schema.org JSON-LD — the same data Google reads to build those rich results.
// Using it means the model never sees the navigation, the advert or the
// eight-paragraph story about a trip to Tuscany. Cheaper, faster, and it can't
// mistake a caption for an ingredient. The extracted fields still go through
// the normal import prompt, because turning "2 cups flour" into a quantity, a
// unit and a name is exactly what that prompt is already good at.
//
// The second is that this fetches a URL a stranger chose, from our server. An
// endpoint that does that without care is a proxy into the private network it
// runs in — see isPublicHost below.

import { lookup } from "node:dns/promises";

export class UrlFetchError extends Error {}

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

/**
 * Whether a hostname resolves to somewhere on the public internet.
 *
 * Checked against the resolved addresses rather than the text of the hostname:
 * a name can be spelled to look external and still point at 127.0.0.1, and
 * cloud metadata services live on ordinary-looking addresses. Every redirect
 * hop is checked again, because the first hop being safe says nothing about
 * where it sends you.
 */
async function isPublicHost(hostname: string): Promise<boolean> {
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    return false;
  }
  if (addresses.length === 0) return false;

  return addresses.every(({ address, family }) => {
    if (family === 6) {
      const a = address.toLowerCase();
      // Loopback, link-local, unique-local, and v4 addresses in v6 clothing.
      if (a === "::1" || a === "::" || a.startsWith("fe80") || a.startsWith("fc") || a.startsWith("fd")) {
        return false;
      }
      if (a.startsWith("::ffff:")) return isPublicV4(a.slice(7));
      return true;
    }
    return isPublicV4(address);
  });
}

function isPublicV4(address: string): boolean {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return false;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a >= 224) return false; // multicast and reserved
  return true;
}

async function safeFetch(raw: string): Promise<{ html: string; finalUrl: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UrlFetchError("That doesn't look like a web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlFetchError("Only http and https links can be fetched.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isPublicHost(url.hostname))) {
      throw new UrlFetchError("That address isn't reachable.");
    }

    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Some sites serve a stub to anything that doesn't look like a
        // browser. Honest about being a bot, in the tail, so a site that
        // wants to refuse us can.
        "User-Agent":
          "Mozilla/5.0 (compatible; RecipeBookMaker/1.0; +https://recipebookmaker.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    }).catch(() => {
      throw new UrlFetchError("Couldn't reach that page. Check the link, or paste the text instead.");
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new UrlFetchError("That link redirects nowhere.");
      url = new URL(location, url); // relative redirects are legal
      continue;
    }

    if (!res.ok) {
      throw new UrlFetchError(
        res.status === 403 || res.status === 401
          ? "That site won't let us read the page. Copy the recipe text and paste it instead."
          : "That page couldn't be loaded. Paste the text instead.",
      );
    }

    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("text")) {
      throw new UrlFetchError("That link isn't a web page.");
    }

    // Read with a ceiling rather than trusting content-length, which is
    // optional and can lie.
    const reader = res.body?.getReader();
    if (!reader) throw new UrlFetchError("That page came back empty.");
    // Decoded as it arrives, so nothing has to be reassembled and the stream
    // can be abandoned the moment it gets too big.
    const decoder = new TextDecoder("utf-8");
    let html = "";
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      html += decoder.decode(value, { stream: true });
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    html += decoder.decode();
    return { html, finalUrl: url.toString() };
  }

  throw new UrlFetchError("That link redirects too many times.");
}

/** Every JSON-LD blob on the page, flattened through @graph and arrays. */
function jsonLdNodes(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const m of html.matchAll(re)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue; // one malformed blob shouldn't lose the others
    }
    const queue = [data];
    while (queue.length) {
      const node = queue.shift();
      if (Array.isArray(node)) queue.push(...node);
      else if (node && typeof node === "object") {
        const o = node as Record<string, unknown>;
        out.push(o);
        if (Array.isArray(o["@graph"])) queue.push(...o["@graph"]);
      }
    }
  }
  return out;
}

const isRecipe = (n: Record<string, unknown>) => {
  const t = n["@type"];
  return typeof t === "string"
    ? t.toLowerCase() === "recipe"
    : Array.isArray(t) && t.some((x) => String(x).toLowerCase() === "recipe");
};

const text = (v: unknown): string =>
  typeof v === "string"
    ? v
    : Array.isArray(v)
      ? v.map(text).filter(Boolean).join("\n")
      : v && typeof v === "object"
        ? text((v as Record<string, unknown>).text ?? (v as Record<string, unknown>).name)
        : "";

/** "PT1H30M" → "1 h 30 min". Left as-is if it isn't a duration. */
function duration(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = v.match(/^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return v;
  const [, h, min] = m;
  return [h ? `${h} h` : "", min ? `${min} min` : ""].filter(Boolean).join(" ");
}

/**
 * Instructions, including the sectioned form.
 *
 * HowToSection is how a site says "For the cake / For the icing", and it is
 * common on exactly the recipes worth importing. Flattened with the section
 * name as a heading line, which the import prompt already understands.
 */
function instructions(v: unknown): string {
  if (!Array.isArray(v)) return text(v);
  return v
    .map((step) => {
      const s = (step ?? {}) as Record<string, unknown>;
      if (String(s["@type"] ?? "").toLowerCase() === "howtosection") {
        return `${text(s.name)}:\n${instructions(s.itemListElement)}`;
      }
      return text(step);
    })
    .filter(Boolean)
    .join("\n");
}

/** The recipe as plain text, from JSON-LD if the page has it. */
function fromJsonLd(html: string): string | null {
  const node = jsonLdNodes(html).find(isRecipe);
  if (!node) return null;

  const ingredients = text(node.recipeIngredient);
  const steps = instructions(node.recipeInstructions);
  if (!ingredients && !steps) return null;

  return [
    text(node.name),
    text(node.description),
    node.recipeYield ? `Serves: ${text(node.recipeYield)}` : "",
    node.prepTime ? `Prep: ${duration(node.prepTime)}` : "",
    node.cookTime ? `Cook: ${duration(node.cookTime)}` : "",
    "",
    "Ingredients:",
    ingredients,
    "",
    "Method:",
    steps,
    text(node.recipeNotes ?? ""),
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/** Whatever readable text the page has, once the furniture is removed. */
function fromHtml(html: string): string {
  return html
    .replace(/<(script|style|noscript|template|svg|nav|header|footer|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export type FetchedRecipe = {
  /** Text to hand to the import prompt. */
  text: string;
  /** Where it came from, after redirects — stored as the recipe's source. */
  source: string;
  /** Whether the page published structured data. Worth logging. */
  structured: boolean;
};

export async function fetchRecipeFromUrl(raw: string): Promise<FetchedRecipe> {
  const { html, finalUrl } = await safeFetch(raw);

  const structured = fromJsonLd(html);
  if (structured) return { text: structured, source: finalUrl, structured: true };

  const plain = fromHtml(html);
  if (plain.length < 200) {
    throw new UrlFetchError(
      "There's not much text on that page. Copy the recipe and paste it instead.",
    );
  }
  // The prompt has its own ceiling; this keeps a very long article from
  // reaching it as mostly comments section.
  return { text: plain.slice(0, 18_000), source: finalUrl, structured: false };
}
