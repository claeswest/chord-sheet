"use client";

// Picks up the recipe someone read on the landing page and saves it, once
// they have an account to save it into.
//
// Mounted on the library. Doing it here rather than in the login callback
// keeps it out of the auth path — a failure saving a recipe must never be
// able to break signing in, and the two have no business sharing a code path.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearPending, readPending } from "@/lib/pendingRecipe";

export default function ClaimPending() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  // Effects run twice in development. Claiming twice would create the recipe
  // twice, and it is not the kind of duplicate anyone notices until later.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const pending = readPending();
    if (!pending) return;
    started.current = true;
    setState("saving");

    void (async () => {
      try {
        const res = await fetch("/api/recipes/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imported: pending }),
        });
        if (!res.ok) {
          // Left in place on failure, so a reload can try again — except when
          // the answer will not change, which is the free limit.
          const data = await res.json().catch(() => ({}));
          if (data.error === "limit_reached") clearPending();
          setState("failed");
          return;
        }
        clearPending();
        setState("idle");
        router.refresh();
      } catch {
        setState("failed");
      }
    })();
  }, [router]);

  if (state === "idle") return null;

  return (
    <p className="mb-6 rounded-card border border-rule bg-paper-sunken px-4 py-3 text-sm text-ink-muted">
      {state === "saving"
        ? "Adding the recipe you started with…"
        : "That recipe couldn't be saved. Reload to try again, or paste it in a new recipe."}
    </p>
  );
}
