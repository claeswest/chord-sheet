@AGENTS.md

## Start here

Read [`docs/status.md`](docs/status.md) before doing anything substantial. It has
the current state of the project, what the latest analysis showed, the reasoning
behind decisions that otherwise look arbitrary, and what's worth doing next.

[`README.md`](README.md) covers setup, environment variables and the gotchas —
including that **local dev writes to the production database**.

## House rules

- **This repository is public.** Never commit customer names, email addresses,
  revenue figures, or `.env`. Live numbers live in `/admin`.
- `src/lib/plans.ts` is the single source of truth for what each tier includes —
  pricing tables, paywalls and server-side gates all read it. Don't hard-code
  tier rules anywhere else.
- Run `npx tsc --noEmit` and a production build before pushing; `master` deploys
  to production automatically.
