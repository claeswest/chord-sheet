// Putting a link on the clipboard, in a browser that may not let you.

/**
 * Copies text. True if it is on the clipboard.
 *
 * The modern clipboard is refused in some places — an in-app browser, a page
 * inside a frame. The old way still works in most of them. Either way the
 * field showing the text is left selected, so that when both fail the
 * keyboard's own copy takes it and the caller only has to say so.
 */
export async function copyText(text: string, field: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    field?.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  }
}
