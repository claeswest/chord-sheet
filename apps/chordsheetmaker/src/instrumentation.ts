// Next.js instrumentation — captures ALL server-side errors (route handlers,
// server components, server actions) and routes them to the central reporter.
// See: node_modules/next/dist/docs/.../instrumentation.md

import type { Instrumentation } from "next";
import { reportError } from "@/lib/reportError";

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const e = err as { message?: string; stack?: string; digest?: string };
  await reportError({
    source: "server:onRequestError",
    message: e?.message ?? String(err),
    stack: e?.stack,
    path: request.path,
    context: {
      method: request.method,
      digest: e?.digest,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
  });
};
