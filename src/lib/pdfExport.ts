/**
 * Generates and downloads a PDF of the chord sheet.
 *
 * Page-break strategy: render content on a transparent background, then scan
 * the canvas pixel data for fully-transparent rows (gaps between lines).
 * Break at the last transparent row at or before the page boundary — this is
 * pixel-perfect and requires no DOM measurement.
 */

const A4_W_MM    = 210;
const A4_H_MM    = 297;
const PADDING_MM = 18;   // top & bottom padding on every page
const SIDE_MM    = 18;   // left & right padding
const DPI        = 96;
const SCALE      = 2;    // render at 2× for sharper text

const mmToPx = (mm: number) => Math.round(mm * (DPI / 25.4) * SCALE);

const PAGE_W_PX    = mmToPx(A4_W_MM);
const PAGE_H_PX    = mmToPx(A4_H_MM);
const PADDING_PX   = mmToPx(PADDING_MM);
const CONTENT_H_PX = PAGE_H_PX - 2 * PADDING_PX;

/** Parse "linear-gradient(rgba(...)), url(data:...)" → { imageUrl, overlay } */
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

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ia = img.naturalWidth / img.naturalHeight;
  const da = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ia > da) { sw = sh * da; sx = (img.naturalWidth  - sw) / 2; }
  else          { sh = sw / da; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

/**
 * Scan canvas pixel data for the best page-break row at or before maxY.
 * We look for a row where every pixel is fully transparent (alpha < 8),
 * meaning it's an empty gap between lyric blocks.
 * We scan backwards from maxY so we get the LAST safe gap before the limit.
 * minY is the start of the current page so we never pick a row from a
 * previous page.
 */
function findBreakRow(data: Uint8ClampedArray, width: number, maxY: number, minY: number): number {
  for (let y = maxY; y >= minY; y--) {
    let empty = true;
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) { empty = false; break; }
    }
    if (empty) return y;
  }
  return maxY; // no gap found — hard cut
}

export async function downloadPdf(filename = "chord-sheet.pdf"): Promise<void> {
  const source = document.getElementById("print-view");
  if (!source) throw new Error("print-view element not found");

  const rawBgImage = source.style.backgroundImage ?? "";
  const rawBgColor = source.style.background || source.style.backgroundColor || "#ffffff";
  const { imageUrl, overlay } = parseBgStyle(rawBgImage);
  const bgImage = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;

  const A4_W_CSS = Math.round(A4_W_MM * (DPI / 25.4));

  // Build clone off-screen to the left (fixed top:0 so Y coords are valid)
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:fixed", "top:0", `left:-${A4_W_CSS + 200}px`,
    `width:${A4_W_CSS}px`, "pointer-events:none",
    "margin:0", "padding:0", "border:none", "background:transparent", "overflow:visible",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.display         = "block";
  clone.style.position        = "static";
  clone.style.width           = "100%";
  clone.style.margin          = "0";
  clone.style.padding         = `0 ${SIDE_MM}mm ${PADDING_MM}mm`;
  clone.style.boxSizing       = "border-box";
  clone.style.backgroundImage = "none";
  clone.style.backgroundColor = "transparent";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    // Render content at transparent background so empty rows have alpha=0
    const contentCanvas = await html2canvas(clone, {
      scale:           SCALE,
      useCORS:         true,
      logging:         false,
      width:           A4_W_CSS,
      windowWidth:     A4_W_CSS,
      scrollX:         0,
      scrollY:         0,
      backgroundColor: null,
    });

    // Read all pixel data once — used for gap detection
    const contentCtx  = contentCanvas.getContext("2d")!;
    const pixelData   = contentCtx.getImageData(0, 0, contentCanvas.width, contentCanvas.height).data;

    // Compute page break positions by scanning for transparent rows
    const pageStarts: number[] = [0];
    let curY = 0;
    while (curY < contentCanvas.height) {
      const limit = curY + CONTENT_H_PX;
      if (limit >= contentCanvas.height) break;
      const breakY = findBreakRow(pixelData, contentCanvas.width, limit, curY);
      if (breakY <= curY) break; // safety
      pageStarts.push(breakY);
      curY = breakY;
    }

    // Compose and save pages
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

      // Background color
      ctx.fillStyle = rawBgColor || "#ffffff";
      ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

      // Background image + overlay
      if (bgImage) {
        drawCover(ctx, bgImage, PAGE_W_PX, PAGE_H_PX);
        if (overlay) { ctx.fillStyle = overlay; ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX); }
      }

      // Content slice placed PADDING_PX from the top
      if (srcH > 0) {
        ctx.drawImage(contentCanvas, 0, srcY, PAGE_W_PX, srcH, 0, PADDING_PX, PAGE_W_PX, srcH);
      }

      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, A4_W_MM, A4_H_MM);
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}
