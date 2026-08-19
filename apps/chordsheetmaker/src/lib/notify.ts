// Admin notifications — "email me when X happens" for the founder.
//
// The sending lives in @clavos/core/notify now; this file is the configuration
// and keeps the two function names the four call sites already use. Sends to
// every address in ADMIN_EMAILS, from EMAIL_FROM, only when RESEND_API_KEY is
// set, and never throws.

import { createNotifier } from "@clavos/core/notify";

const notifier = createNotifier({
  product: "ChordSheetMaker",
  from: process.env.EMAIL_FROM ?? "ChordSheetMaker <onboarding@resend.dev>",
});

export function adminRecipients(): string[] {
  return notifier.recipients();
}

export async function notifyAdmin(subject: string, lines: string[]): Promise<void> {
  return notifier.send(subject, lines);
}
