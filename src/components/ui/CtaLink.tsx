"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackCtaTryFree } from "@/lib/analytics";

/**
 * Link that fires the cta_try_free funnel event with the page it sits on
 * (e.g. "home", "chord-chart-maker"). Server pages can't call gtag directly,
 * so main CTAs use this thin client wrapper.
 */
export default function CtaLink({
  from,
  ...props
}: { from: string } & ComponentProps<typeof Link>) {
  return <Link {...props} onClick={() => trackCtaTryFree(from)} />;
}
