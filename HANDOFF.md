# HANDOFF

**Last updated:** 2026-10-22 (session 1)

**Current position:** Phase 4 code done and `npm run build` passes. BLOCKED on Neon login + secrets before migrate/ingest/smoke tests.

## Done
- Frontend: src/proxy.ts (Next 16 'middleware') HMAC-signed cookie gate on APP_PASSWORD; /login, /api/login, /api/logout; pages /, /runs/[id] (filters, reason, approve/override/reject + pre-placement check), /exceptions, /skus/[code] (SVG chart + cover history); loading/error/not-found states. `npm run build` OK.
- next.config: cacheComponents disabled (all pages are live data; force-dynamic). src/lib/db.ts creates Prisma lazily so build/CI work without DATABASE_URL.
- API: src/lib/api.ts (handler wrapper, {error:{code,message}}), src/lib/validation.ts (zod), src/lib/services/planning.ts, all routes in spec + GET /api/skus/[code]. tsc + lint clean. NOT yet curl-tested (needs DB).
- Data scripts: src/lib/services/csvLoader.ts, runInput.ts; scripts/ingest.ts (upserts, writes data-quality.md), check-data.ts, dry-run.ts (CSV→engine, no DB). Dry run 2026-10-19: STOCKOUT 2, OVERSTOCK 2, OK 8, EXCEPTION 3 (all E7), exception rate 20%, guardrail 0.20× units.
- Engine (pure TS) in src/lib/engine: stats, evaluate (rules + E1–E7 + guardrail), preplacement, metrics; thresholds in src/config/engine.ts. Vitest: 19/19 pass incl. spec Ex1–Ex4.
- prisma/schema.prisma written (11 models + enums), validated, client generated. Not migrated yet (no DB).
- A2.3 mapping confirmed (see Decisions: Q_std, festival, distributor, no-price).
- Step 0: scripts/inspect-data.ts written and run (`npm run data:inspect`); proposal in src/config/columnMap.ts; shared CSV helpers in src/lib/csv.ts. Data is clean: 15 SKUs, 4 distributors, 16 ISO weeks (2026-W27..W42 = Mon 2026-06-29..Sun 2026-10-18), inventory as of 2026-10-19, no gaps, duplicates, unmatched IDs or negatives.
- Created .env.local (gitignored) with DATA_DIR set and blank secret slots.
- Phase 1 complete: GitHub repo https://github.com/durgeshforai-sketch/freshroots-demand-planner (public); `main` and `dev` pushed; `main` protected (PR required, 0 approvals, no force-push or deletion). Working branch: `dev`.
- Scaffolded Next.js 16.4.2 (App Router, TS, ESLint, Tailwind 4, src/), Prisma 7.10.1 + @prisma/adapter-neon, Vitest 5, tsx, zod 4, dotenv. `postinstall` runs `prisma generate`.
- Added src/lib/db.ts (Neon adapter, pooled DATABASE_URL), src/lib/logger.ts (JSON logs), prisma.config.ts, vitest.config.ts, .env.example, .gitignore, README skeleton.
- Created CLAUDE.md, HANDOFF.md, docs/BUILD_SPEC.md (Part B verbatim).
- Tools: node 24.15, npm 11.12, git 2.50, gh 2.94 (authed), Vercel CLI 63.1 (authed as durgeshforai-sketch). neonctl and psql are not installed; use `npx neonctl`.

## In progress
- Nothing running. Waiting on user for Neon.

## Next 3 actions
1. When Neon is ready: `npx prisma migrate dev --name init`, `npm run data:ingest`, `npm run data:check`.
1b. Curl-smoke every endpoint against `npm run dev`; record results here. Meanwhile: CI workflow, skills/, README (Phases 6–7, no DB needed).
2. After Neon login: create project `freshroots-planner`; user pastes DATABASE_URL and DIRECT_URL into .env.local (A2.2).
3. `npx prisma migrate dev --name init`, then write and run scripts/ingest.ts and scripts/check-data.ts.

## Decisions made
- Project root: `<case folder>/freshroots-planner`. DATA_DIR: the case folder (its parent), outside the repo.
- Prisma pinned to 7.10.1: npm's `latest` tag points to 8.0.0-rc.25, a prerelease.
- Prisma 7 removes `url` and `directUrl` from schema.prisma. Equivalent setup: prisma.config.ts uses DIRECT_URL for the CLI and migrations; the app uses DATABASE_URL (pooled) via PrismaNeon. This deviates from the spec's "directUrl in schema.prisma" and has the same effect.
- Next 16: `middleware.ts` is renamed `proxy.ts`. Use src/proxy.ts for the password gate. Route `params` are async.
- @types/node bumped to ^24 to satisfy the vitest peer dependency.
- MAPPING (confirmed): Q_std = Sku.standardReorderQty from the CSV, falling back to 4×AVG12 (config `qStdSource`). Festival F = 1.25 if any day of [runDate, runDate+28d] overlaps a Festival [start,end]; calendar months become Festival rows spanning the month. WeeklySale.distributor is derived from sku_master.Distributor_ID. No unit price: guardrail compares UNITS (total Q vs 1.5× sum of Q_std); E6 and order value are skipped with a warning; rupees are used automatically when unitPrice exists. casePack defaults to 1; leadTime null means E5 is skipped; onOrder null is treated as 0 and labelled.
- Out-of-footprint distributor regions (Karnataka, Gujarat) are kept and noted in data-quality.md.
- Surge confirmation = rolling test: AVG4>1.2×D true for the window ending the latest week AND the window ending the week before (D uses the run's F). Spec tests give AVG values directly, so they call decideSku with explicit stats.
- EXCEPTION rows keep qty=0 and store the engine figure in the reason ("Engine figure for reference").
- E7 is checked only for STOCKOUT_RISK/HIGH_DEMAND. E2 swing is in either direction. E3 = flag active on the run date for the SKU, or for a distributor selling it (distributor-only flags).
- Guardrail sums auto qty (exceptions excluded) vs Σ Q_std of all SKUs. FINDING: per-SKU Q ≤ 1.5×Q_std, so at 1.5× the guardrail only fires via rounding, bugs or config changes. Document in README for Raghav and Deepa.
- Override rate = (OVERRIDE + REJECT) / decisions.
- Decisions: only PENDING recs can be decided (409 otherwise). APPROVE on EXCEPTION is refused (409): Raghav must OVERRIDE with a qty or REJECT. OVERRIDE needs newQty and can't use reasonCode AGREE. decidedBy is optional in the body (default "Raghav Kulkarni"), an addition to the spec.
- Pre-placement: POST without ownerDecision runs a check; with {owner, ownerDecision: PROCEED|REDUCE|CANCEL} it records the owner's call on the latest HOLD. If no new sales week has landed since the run, it checks event flags only and notes that in triggers.
- Default runDate = latest inventory snapshot date.
- Generated Prisma client goes to src/generated/prisma (gitignored, rebuilt on postinstall).

## Waiting on me
- Neon login: user runs `npx neonctl@8.10.3 auth`.
- Then DATABASE_URL and DIRECT_URL in .env.local.

## Env vars
- DATABASE_URL — not set
- DIRECT_URL — not set
- DATA_DIR — set (.env.local)
- APP_PASSWORD — not set

## Verify state
- `git log -5 --oneline` and `git branch --show-current` (expect dev)
- `npx tsc --noEmit` (run `npx next typegen` first if .next is missing)
- `npm test` (after Phase 3)
- `npx prisma migrate status` (after Phase 2)

## Known issues
- `tsc` needs `npx next typegen` first on a fresh clone (LayoutProps comes from generated route types).
- npm audit reports some advisories from the scaffold; not addressed (no `--force`).
