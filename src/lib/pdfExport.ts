/**
 * Generates and downloads a PDF of the chord sheet.
 * Uses html2pdf.js (html2canvas + jsPDF) — not the browser print dialog.
 *
 * Strategy:
 *  1. The #print-view portal is always in the DOM but CSS-hidden (display:none).
 *  2. We clone it into a temporary wrapper that IS visible (position:absolute,
 *     far above the viewport) so html2canvas gets a real layout to capture.
 *  3. After capture we remove the clone — the original is untouched.
 */
export async function downloadPdf(filename = "chord-sheet.pdf"): Promise<void> {
  const source = document.getElementById("print-view");
  if (!source) throw new Error("print-view element not found");

  // A4 at 96 dpi ≈ 794 px wide
  const A4_PX_WIDTH = 794;

  // Create a temporary off-screen wrapper that has real layout.
  // No padding here — margins are added by html2pdf itself.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:absolute",
    "top:-99999px",
    "left:0",
    `width:${A4_PX_WIDTH}px`,
    "margin:0",
    "padding:0",
    "border:none",
    "background:transparent",
  ].join(";");

  // Deep-clone the portal content (already has all inline styles / class names)
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.display  = "block";
  clone.style.position = "static";
  clone.style.width    = "100%";
  clone.style.margin   = "0";
  clone.style.padding  = "0";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Two animation frames — lets the browser fully lay out the clone before capture
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  try {
    // Dynamic import so the ~500 kB bundle is only loaded when needed
    const html2pdf = (await import("html2pdf.js")).default;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      margin:      [18, 18, 18, 18],   // mm: top, right, bottom, left
      filename,
      image:       { type: "jpeg", quality: 0.97 },
      html2canvas: {
        scale:       2,                // 2× for sharper text
        useCORS:     true,
        logging:     false,
        width:       A4_PX_WIDTH,
        windowWidth: A4_PX_WIDTH,
        scrollX:     0,
        scrollY:     0,
      },
      jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:   { mode: ["css", "legacy"], avoid: ".print-lyric-block" },
    };

    await html2pdf().set(options).from(clone).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
