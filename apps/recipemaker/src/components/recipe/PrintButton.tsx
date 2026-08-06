"use client";

// Print / Save as PDF.
//
// This calls the browser's own print dialog rather than generating a file in
// JavaScript. packages/core's downloadPdf() rasterises the page, which suits
// ChordSheetMaker's image-backed sheets but is the wrong choice here: a printed
// recipe wants selectable text, real hyphenation, and page breaks the browser
// can put between ingredients rather than through them. It is also how you get
// a sane result on a phone, where "Save as PDF" is in the share sheet.
//
// Every browser's print dialog offers "Save as PDF", so this is the PDF export
// as well as the print button. Hence the label.

export default function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className={
        className ||
        "rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper-raised"
      }
    >
      Print / Save as PDF
    </button>
  );
}
