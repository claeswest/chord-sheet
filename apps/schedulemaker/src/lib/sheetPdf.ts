// The finished sheet as a PDF file, without the print dialog.
//
// "Skriv ut" can already save a PDF, and that one is the better file: the
// browser writes it, so the text is text and it is sharp at any size. But it
// is three taps deep in a dialog that looks different in every browser, and on
// a phone it is somewhere most people never find. A parent who wants the
// schedule as a file — to send to the other parent, to print at work — should
// get one from one button.
//
// Made here in the browser, like everything else: the schedule still goes
// nowhere. That rules out the way the notes in docs/schedulemaker.md would
// make a press-ready file (a headless browser on a server), and leaves one
// honest way to do it on the page: draw the sheet to a canvas and put that
// picture on a page of the right size. So this PDF is a picture of the sheet —
// about 290 dpi on A4, which a home printer cannot tell from the real thing —
// and its text cannot be selected. The dialog's own PDF stays where it was.
//
// The picture is taken of a copy, not of the sheet on screen. The one on
// screen is scaled to the window by FitToWidth and has the app's buttons in
// it; the copy is laid out at the paper's width, the way the printer gets it.

const PX_PER_MM = 96 / 25.4;

/** Pixels along the page's long side. 3400 on A4 is 290 dpi; on A3, 205. */
const LONG_SIDE_PX = 3400;

const frame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/**
 * Give every drawing that is pinned to a corner a box to be pinned in.
 *
 * The canvas library draws an SVG by lifting it out of the page as an image,
 * with its computed styles written onto it. For the subject symbols that is
 * exactly right. The style's illustration is positioned — top right of the
 * sheet, 9mm down — and that came along too: inside its own image the drawing
 * moved itself 1,070 pixels to the right of a 49-pixel frame, and the PDF had
 * no paper plane, on any style, with nothing reported.
 *
 * So the position goes on a wrapper, and the drawing inside it stays put.
 */
function unpinDrawings(root: HTMLElement) {
  for (const svg of root.querySelectorAll<SVGSVGElement>("svg")) {
    const at = getComputedStyle(svg);
    if (at.position !== "absolute") continue;
    const box = document.createElement("span");
    box.style.cssText = `position:absolute;display:block;top:${at.top};left:${at.left};width:${at.width};height:${at.height}`;
    svg.replaceWith(box);
    box.appendChild(svg);
    svg.style.cssText += ";position:static;display:block;width:100%;height:100%";
  }
}

/**
 * Draws the sheet and returns it as a one-page PDF of the given paper size.
 *
 * Needs the finished sheet on the page (step three). Throws if it is not
 * there or the drawing fails; the caller says so in words.
 */
export async function sheetPdf(paper: { wMm: number; hMm: number }): Promise<Blob> {
  const live = document.querySelector<HTMLElement>(".sheet-theme");
  if (!live) throw new Error("no sheet on the page");

  const holder = document.createElement("div");
  holder.className = "pdf-capture";
  // The style and the ink switch are attributes on this box, so the copy
  // brings them along.
  const copy = live.cloneNode(true) as HTMLElement;
  holder.appendChild(copy);
  document.body.appendChild(holder);

  try {
    copy.querySelectorAll(".no-print").forEach((n) => n.remove());
    const sheet = copy.querySelector<HTMLElement>(".sheet");
    if (!sheet) throw new Error("no sheet in the copy");

    await document.fonts.ready;

    // The same fit the printer gets (see PrintFit): how tall is the sheet at
    // the paper's width, and if that is more than a page, lay it out wider by
    // the same factor. Wider and then shrunk is the paper's shape again, with
    // nothing cut off and nothing squeezed.
    sheet.style.width = `${paper.wMm}mm`;
    sheet.style.minHeight = "0";
    await frame();
    const natural = sheet.scrollHeight;
    const fit = natural > 0 ? Math.min(1, (paper.hMm * PX_PER_MM) / natural) : 1;
    sheet.style.width = `${paper.wMm / fit}mm`;
    sheet.style.minHeight = `${paper.hMm / fit}mm`;
    await frame();

    unpinDrawings(sheet);

    const box = sheet.getBoundingClientRect();
    const paperColor = getComputedStyle(sheet).backgroundColor;

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(sheet, {
      scale: LONG_SIDE_PX / Math.max(box.width, box.height),
      backgroundColor: paperColor,
      logging: false,
      useCORS: true,
    });

    const pdf = new jsPDF({
      unit: "mm",
      format: [paper.wMm, paper.hMm],
      orientation: paper.wMm > paper.hMm ? "landscape" : "portrait",
      compress: true,
    });

    // Fitted and centred rather than stretched. The sums above make the
    // picture the paper's shape, but they are sums about a browser's text
    // layout, and a sheet a few pixels taller than expected should come out
    // with a sliver of margin — not with every letter slightly squashed.
    const scale = Math.min(paper.wMm / canvas.width, paper.hMm / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    pdf.setFillColor(paperColor);
    pdf.rect(0, 0, paper.wMm, paper.hMm, "F");
    pdf.addImage(canvas, "PNG", (paper.wMm - w) / 2, (paper.hMm - h) / 2, w, h, undefined, "FAST");

    return pdf.output("blob");
  } finally {
    holder.remove();
  }
}

/** A file name from what the sheet is called: "Annas schema" → "annas-schema.pdf". */
export function pdfName(heading: string | undefined, title: string): string {
  const base = (heading?.trim() || title.trim() || "schema")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "schema"}.pdf`;
}

/** Hands a file to the browser to save. */
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Not at once: Safari starts the download after this function returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
