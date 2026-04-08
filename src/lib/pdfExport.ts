/**
 * Generates and downloads a PDF of the chord sheet.
 *
 * Approach: html2canvas renders the content (without background), then we
 * manually compose each A4 page canvas by:
 *   1. Drawing the full-bleed background (color + image + overlay)
 *   2. Drawing the content slice offset by PADDING from top
 *
 * Page breaks are snapped to the gap between lyric/section blocks so no
 * line is ever bisected at a page boundary.
 */

const A4_W_MM    = 210;
const A4_H_MM    = 297;
const PADDING_MM = 20;   // top & bottom padding on every page
const SIDE_MM    = 18;   // left & right padding
const DPI        = 96;
const SCALE      = 2;    // render at 2× for sharper text

const mmToPx = (mm: number) => Math.round(mm * (DPI / 25.4) * SCALE);

const PAGE_W_PX    = mmToPx(A4_W_MM);
const PAGE_H_PX    = mmToPx(A4_H_MM);
const PADDING_PX   = mmToPx(PADDING_MM);
const CONTENT_H_PX = PAGE_H_PX - 2 * PADDING_PX;   // usable content height per page

/** Parse "linear-gradient(rgba(...), rgba(...)), url(data:...)" → { imageUrl, overlay } */
function parseBgStyle(css: string): { imageUrl: string | null; overlay: string | null } {
  const urlMatch  = css.match(/url\(["']?(data:[^"')]+)["']?\)/);
  const rgbaMatch = css.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)/);
  return { imageUrl: urlMatch ? urlMatch[1] : null, overlay: rgbaMatch ? rgbaMatch[0] : null };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}

/** Draw image scaled to cover the full canvas (background-size: cover, centered) */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ia = img.naturalWidth / img.naturalHeight;
  const da = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ia > da) { sw = sh * da; sx = (img.naturalWidth  - sw) / 2; }
  else          { sh = sw / da; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

export async function downloadPdf(filename = "chord-sheet.pdf"): Promise<void> {
  const source = document.getElementById("print-view");
  if (!source) throw new Error("print-view element not found");

  // ── 1. Parse background ───────────────────────────────────────────────────
  const rawBgImage = source.style.backgroundImage ?? "";
  const rawBgColor = source.style.background || source.style.backgroundColor || "#ffffff";
  const { imageUrl, overlay } = parseBgStyle(rawBgImage);
  const bgImage = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;

  const A4_W_CSS = Math.round(A4_W_MM * (DPI / 25.4)); // px at 1×

  // ── 2. Build off-screen clone ─────────────────────────────────────────────
  // Position to the LEFT of the viewport (not above it) so that Y coordinates
  // are in the normal range — getBoundingClientRect is accurate.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:fixed",
    `top:0`,
    `left:-${A4_W_CSS + 200}px`,
    `width:${A4_W_CSS}px`,
    "visibility:hidden",
    "pointer-events:none",
    "margin:0", "padding:0", "border:none", "background:transparent",
    "overflow:visible",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.display         = "block";
  clone.style.position        = "static";
  clone.style.width           = "100%";
  clone.style.margin          = "0";
  clone.style.padding         = `0 ${SIDE_MM}mm`;
  clone.style.boxSizing       = "border-box";
  clone.style.backgroundImage = "none";        // bg drawn per-page separately
  clone.style.backgroundColor = "transparent";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Wait for layout
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    // ── 3. Measure block Y positions using getBoundingClientRect ──────────────
    // The wrapper is off-screen left but Y=0, so rects have correct Y values.
    const cloneTop = clone.getBoundingClientRect().top;

    const blockEls = clone.querySelectorAll<HTMLElement>(
      ".print-lyric-block, .print-section, .print-song-title, .print-song-artist"
    );

    // Collect block extents in canvas pixels (SCALE applied)
    const blocks = Array.from(blockEls).map(el => {
      const r = el.getBoundingClientRect();
      return {
        top:    Math.round((r.top    - cloneTop) * SCALE),
        bottom: Math.round((r.bottom - cloneTop) * SCALE),
      };
    }).filter(b => b.bottom > b.top)
      .sort((a, b) => a.top - b.top);

    /**
     * Find the best page-break point at or before targetY.
     * We prefer breaking at a block's BOTTOM (after a complete line),
     * falling back to the block's TOP (push entire block to next page).
     */
    function smartBreak(targetY: number): number {
      let best = 0;
      for (const b of blocks) {
        // A block's bottom edge: safe to break here (block is complete above)
        if (b.bottom <= targetY) best = Math.max(best, b.bottom);
        // A block's top edge: also safe (block hasn't started yet)
        else if (b.top <= targetY) best = Math.max(best, b.top);
      }
      // If we found a clean break, use it; otherwise fall back to hard cut
      return best > 0 ? best : targetY;
    }

    // ── 4. Render content canvas ──────────────────────────────────────────────
    const contentCanvas = await html2canvas(clone, {
      scale:           SCALE,
      useCORS:         true,
      logging:         false,
      width:           A4_W_CSS,
      windowWidth:     A4_W_CSS,
      scrollX:         0,
      scrollY:         0,
      backgroundColor: null,   // transparent — bg drawn per-page
    });

    // ── 5. Compute page break positions ───────────────────────────────────────
    const pageStarts: number[] = [0];
    let curY = 0;
    while (curY < contentCanvas.height) {
      const target = curY + CONTENT_H_PX;
      if (target >= contentCanvas.height) break;
      const breakY = smartBreak(target);
      if (breakY <= curY) break;  // safety: avoid infinite loop
      pageStarts.push(breakY);
      curY = breakY;
    }

    // ── 6. Compose & save pages ───────────────────────────────────────────────
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < pageStarts.length; i++) {
      if (i > 0) pdf.addPage();

      const srcY   = pageStarts[i];
      const srcEnd = i + 1 < pageStarts.length ? pageStarts[i + 1] : contentCanvas.height;
      const srcH   = srcEnd - srcY;

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width  = PAGE_W_PX;
      pageCanvas.height = PAGE_H_PX;
      const ctx = pageCanvas.getContext("2d")!;

      // a) Background color
      ctx.fillStyle = rawBgColor || "#ffffff";
      ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

      // b) Background image + overlay
      if (bgImage) {
        drawCover(ctx, bgImage, PAGE_W_PX, PAGE_H_PX);
        if (overlay) { ctx.fillStyle = overlay; ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX); }
      }

      // c) Content slice inset by PADDING_PX from top
      if (srcH > 0) {
        ctx.drawImage(contentCanvas, 0, srcY, PAGE_W_PX, srcH, 0, PADDING_PX, PAGE_W_PX, srcH);
      }

      pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, A4_W_MM, A4_H_MM);
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}
