# HANDOFF

**Last updated:** 2026-10-22 (session 1)

**Current position:** Phase 2 — Step 0 data inspection (writing scripts/inspect-data.ts).

## Done
- Phase 1 complete: GitHub repo https://github.com/durgeshforai-sketch/freshroots-demand-planner (public); `main` and `dev` pushed; `main` protected (PR required, 0 approvals, no force-push or deletion). Working branch: `dev`.
- Scaffolded Next.js 16.4.2 (App Router, TS, ESLint, Tailwind 4, src/), Prisma 7.10.1 + @prisma/adapter-neon, Vitest 5, tsx, zod 4, dotenv. `postinstall` runs `prisma generate`.
- Added src/lib/db.ts (Neon adapter, pooled DATABASE_URL), src/lib/logger.ts (JSON logs), prisma.config.ts, vitest.config.ts, .env.example, .gitignore, README skeleton.
- Created CLAUDE.md, HANDOFF.md, docs/BUILD_SPEC.md (Part B verbatim).
- Tools: node 24.15, npm 11.12, git 2.50, gh 2.94 (authed), Vercel CLI 63.1 (authed as durgeshforai-sketch). neonctl and psql are not installed; use `npx neonctl`.

## In progress
- Step 0: scripts/inspect-data.ts and src/config/columnMap.ts.

## Next 3 actions
1. Write and run scripts/inspect-data.ts; propose src/config/columnMap.ts; STOP for mapping OK (A2.3).
2. Neon project via `npx neonctl` (or dashboard steps); user sets DATABASE_URL and DIRECT_URL in .env.local (A2.2).
3. Write schema.prisma from the mapping; `npx prisma migrate dev --name init`.

## Decisions made
- Project root: `<case folder>/freshroots-planner`. DATA_DIR: the case folder (its parent), outside the repo.
- Prisma pinned to 7.10.1: npm's `latest` tag points to 8.0.0-rc.25, a prerelease.
- Prisma 7 removes `url` and `directUrl` from schema.prisma. Equivalent setup: prisma.config.ts uses DIRECT_URL for the CLI and migrations; the app uses DATABASE_URL (pooled) via PrismaNeon. This deviates from the spec's "directUrl in schema.prisma" and has the same effect.
- Next 16: `middleware.ts` is renamed `proxy.ts`. Use src/proxy.ts for the password gate. Route `params` are async.
- @types/node bumped to ^24 to satisfy the vitest peer dependency.
- Generated Prisma client goes to src/generated/prisma (gitignored, rebuilt on postinstall).

## Waiting on me
- Nothing yet. Step 0 mapping OK comes next.

## Env vars
- DATABASE_URL — not set
- DIRECT_URL — not set
- DATA_DIR — not set (value will be the case folder path)
- APP_PASSWORD — not set

## Verify state
- `git log -5 --oneline` and `git branch --show-current` (expect dev)
- `npx tsc --noEmit` (run `npx next typegen` first if .next is missing)
- `npm test` (after Phase 3)
- `npx prisma migrate status` (after Phase 2)

## Known issues
- `tsc` needs `npx next typegen` first on a fresh clone (LayoutProps comes from generated route types).
- npm audit reports some advisories from the scaffold; not addressed (no `--force`).
