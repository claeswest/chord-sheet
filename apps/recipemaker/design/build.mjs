// Inlines tokens.css into every preview so each file renders standalone —
// the Design System pane shows them individually and sibling assets may not
// resolve. tokens.css stays the single source of truth; run this after editing
// it, and the <style data-tokens> block in each preview is regenerated.
//
//   node design/build.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = readFileSync(join(here, "tokens.css"), "utf8");

const BEGIN = '<style data-tokens="generated from tokens.css — edit that file, then run design/build.mjs">';
const END = "</style>";

function previews(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return previews(p);
    return name.endsWith(".html") ? [p] : [];
  });
}

let changed = 0;
for (const file of previews(here)) {
  let html = readFileSync(file, "utf8");
  const block = `${BEGIN}\n${tokens}\n${END}`;

  if (html.includes(BEGIN)) {
    html = html.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), block);
  } else {
    // Replace the <link> to tokens.css, or fall back to inserting before </head>.
    const link = /<link[^>]*tokens\.css[^>]*>/;
    html = link.test(html) ? html.replace(link, block) : html.replace("</head>", `${block}\n</head>`);
  }

  writeFileSync(file, html);
  changed++;
}
console.log(`inlined tokens into ${changed} preview(s)`);
