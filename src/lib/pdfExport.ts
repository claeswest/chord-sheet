/**
 * Generates and downloads a PDF of the chord sheet.
 *
 * Approach: html2canvas renders the content (without background), then we
 * manually compose each A4 page canvas by:
 *   1. Drawing the full-bleed background (color + image + overlay)
 *   2. Drawing the content slice offset by PADDING from top and bottom
 *
 * This gives true per-page padding while keeping the background image
 * covering the entire page on every page.
 */

const A4_W_MM  = 210;
const A4_H_MM  = 297;
const PADDING_MM = 20;   // top & bottom padding on every page
const SIDE_MM    = 18;   // left & right padding
const DPI        = 96;
const SCALE      = 2;    // render at 2× for sharper text

const mmToPx = (mm: number) => Math.round(mm * (DPI / 25.4) * SCALE);

const PAGE_W_PX    = mmToPx(A4_W_MM);
const PAGE_H_PX    = mmToPx(A4_H_MM);
const PADDING_PX   = mmToPx(PADDING_MM);
const CONTENT_H_PX = PAGE_H_PX - 2 * PADDING_PX;  // usable height per page

/** Parse "linear-gradient(rgba(...), rgba(...)), url(data:...)" → { imageUrl, overlay } */
function parseBgStyle(bgImageCss: string): { imageUrl: string | null; overlay: string | null } {
  const urlMatch   = bgImageCss.match(/url\(["']?(data:[^"')]+)["']?\)/);
  const rgbaMatch  = bgImageCss.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)/);
  return {
    imageUrl: urlMatch  ? urlMatch[1]  : null,
    overlay:  rgbaMatch ? rgbaMatch[0] : null,
  };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}

/** Draw image scaled to cover the canvas (like background-size:cover, centered) */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const imgAspect  = img.naturalWidth  / img.naturalHeight;
  const destAspect = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgAspect > destAspect) {
    sw = img.naturalHeight * destAspect;
    sx = (img.naturalWidth  - sw) / 2;
  } else {
    sh = img.naturalWidth  / destAspect;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

export async function downloadPdf(filename = "chord-sheet.pdf"): Promise<void> {
  const source = document.getElementById("print-view");
  if (!source) throw new Error("print-view element not found");

  // ── 1. Parse background from source element ───────────────────────────────
  const rawBgImage = source.style.backgroundImage ?? "";
  const rawBgColor = source.style.background || source.style.backgroundColor || "#ffffff";
  const { imageUrl, overlay } = parseBgStyle(rawBgImage);
  const bgImage = imageUrl ? await loadImage(imageUrl).catch(() => null) : null;

  // ── 2. Clone element — strip its background so we only render content ─────
  const A4_W_CSS = Math.round(A4_W_MM * (DPI / 25.4)); // px at 1×

  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:absolute", "top:-99999px", "left:0",
    `width:${A4_W_CSS}px`, "margin:0", "padding:0", "border:none", "background:transparent",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.display          = "block";
  clone.style.position         = "static";
  clone.style.width            = "100%";
  clone.style.margin           = "0";
  clone.style.padding          = `0 ${SIDE_MM}mm`;
  clone.style.boxSizing        = "border-box";
  clone.style.backgroundImage  = "none";       // stripped — drawn per-page below
  clone.style.backgroundColor  = "transparent";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Two rAFs so the browser fully lays out the clone before capture
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    // ── 3. Render content to a single tall canvas ───────────────────────────
    const contentCanvas = await html2canvas(clone, {
      scale:       SCALE,
      useCORS:     true,
      logging:     false,
      width:       A4_W_CSS,
      windowWidth: A4_W_CSS,
      scrollX:     0,
      scrollY:     0,
      backgroundColor: null,   // transparent — we draw our own bg
    });

    // ── 4. Compose pages ────────────────────────────────────────────────────
    const numPages = Math.ceil(contentCanvas.height / CONTENT_H_PX);
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < numPages; i++) {
      if (i > 0) pdf.addPage();

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width  = PAGE_W_PX;
      pageCanvas.height = PAGE_H_PX;
      const ctx = pageCanvas.getContext("2d")!;

      // a) Background color fill
      ctx.fillStyle = rawBgColor || "#ffffff";
      ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

      // b) Background image (cover) + overlay tint
      if (bgImage) {
        drawCover(ctx, bgImage, PAGE_W_PX, PAGE_H_PX);
        if (overlay) {
          ctx.fillStyle = overlay;
          ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);
        }
      }

      // c) Content slice, inset by PADDING_PX top & bottom
      const srcY = i * CONTENT_H_PX;
      const srcH = Math.min(CONTENT_H_PX, contentCanvas.height - srcY);
      if (srcH > 0) {
        ctx.drawImage(
          contentCanvas,
          0, srcY, PAGE_W_PX, srcH,          // source region
          0, PADDING_PX, PAGE_W_PX, srcH,    // destination (padded from top)
        );
      }

      const imgData = pageCanvas.toDataURL("image/jpeg", 0.97);
      pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM);
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}
