// Admin notifications — "email me when someone subscribes or leaves".
//
// Same sender as ChordSheetMaker's, configured for this product. Reuses the
// RESEND_API_KEY this app already has for magic-link sign-in, so the only new
// variable is ADMIN_EMAILS; without it nothing is sent and nothing breaks.

import { createNotifier } from "@clavos/core/notify";

const notifier = createNotifier({
  product: "RecipeBookMaker",
  from: process.env.EMAIL_FROM ?? "RecipeBookMaker <onboarding@resend.dev>",
});

export function adminRecipients(): string[] {
  return notifier.recipients();
}

export async function notifyAdmin(subject: string, lines: string[]): Promise<void> {
  return notifier.send(subject, lines);
}
