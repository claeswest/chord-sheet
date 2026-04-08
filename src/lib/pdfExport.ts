/**
 * Generates and downloads a PDF of the chord sheet.
 * Uses html2pdf.js (html2canvas + jsPDF under the hood) so we are not
 * dependent on browser @page / print-dialog margin behaviour.
 *
 * The #print-view element is portalled to <body> by PrintView.tsx.
 * We temporarily make it visible off-screen at A4 width so html2canvas
 * can measure and render it correctly, then restore it afterwards.
 */
export async function downloadPdf(filename = "chord-sheet.pdf"): Promise<void> {
  const el = document.getElementById("print-view");
  if (!el) throw new Error("print-view element not found");

  // A4 at 96 dpi ≈ 794 px wide
  const A4_PX_WIDTH = 794;

  // Temporarily make the element visible off-screen so html2canvas can render it
  const prev = {
    display:   el.style.display,
    position:  el.style.position,
    left:      el.style.left,
    top:       el.style.top,
    width:     el.style.width,
    minHeight: el.style.minHeight,
  };

  el.style.display   = "block";
  el.style.position  = "fixed";
  el.style.left      = "-9999px";
  el.style.top       = "0";
  el.style.width     = `${A4_PX_WIDTH}px`;
  el.style.minHeight = "0";

  try {
    // Dynamic import so the ~500 kB bundle is only loaded when needed
    const html2pdf = (await import("html2pdf.js")).default;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      margin:     [18, 18, 18, 18],          // mm: top, right, bottom, left
      filename,
      image:      { type: "jpeg", quality: 0.97 },
      html2canvas: {
        scale: 2,                             // 2× for sharper text
        useCORS: true,
        logging: false,
        width: A4_PX_WIDTH,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: ".print-lyric-block" },
    };

    await html2pdf()
      .set(options)
      .from(el)
      .save();
  } finally {
    // Always restore original styles
    el.style.display   = prev.display;
    el.style.position  = prev.position;
    el.style.left      = prev.left;
    el.style.top       = prev.top;
    el.style.width     = prev.width;
    el.style.minHeight = prev.minHeight;
  }
}
