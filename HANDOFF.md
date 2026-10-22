# HANDOFF

**Last updated:** 2026-10-22 (session 1)

**Current position:** Phase 3 smoke tests PASSED locally. Next: Phase 5 (Vercel env vars + preview smoke test).

## Done
- Vercel env vars DATABASE_URL, DIRECT_URL, APP_PASSWORD set for Production + Preview as Secret (piped from .env.local, never printed). `prisma migrate status`: up to date.
- Phase 3 local smoke test (2026-10-22, npm run dev, Neon): ALL PASS.
  - health 200 (db up); unauthenticated /api/runs 401; login ok 200, bad password 401; page without cookie 307 → /login?next=/.
  - POST /api/runs: bad date 400 VALIDATION_ERROR; valid 201 (run 1: STOCKOUT 2, OVERSTOCK 2, OK 8, EXC 3 = E7×3, matches dry run). GET runs 200; runs/999 404; runs/abc 400.
  - recommendations: flag + perishable filters 200; flag=BOGUS 400. exceptions 200 {E7:3}. metrics 200. skus/SKU001 200, NOPE 404.
  - decision: APPROVE on EXCEPTION 409; OVERRIDE without qty 400; OVERRIDE+AGREE 400; bad action 400; invalid JSON 400; APPROVE 201; second decision 409; exception OVERRIDE 900 201; REJECT 201; id 999 404.
  - preplacement: on PENDING 409; on APPROVED → PROCEED; after DIST002 flag → HOLD; owner decision without owner 400; with owner 201.
  - flags: no target 400; end<start 400; distributor flag 201. Next run (3): DIST002's SKU003/004/008/014 → E3 (exc rate 40%, above band).
  - metrics after decisions: override rate 67% → overrideWarn true.
  - UI: /, /runs/[id], /exceptions, /skus/SKU001, /login all 200 and render; the user ran the engine from the Browser pane (run 2).
- Phase 2 complete: migration 20261022112544_init applied to Neon; ingest loaded Sku 15, Distributor 4, WeeklySale 240, InventorySnapshot 15, Festival 6, 0 rejects, in ~4s; re-run gives identical counts (idempotent). data-quality.md written. Sales ingest uses one INSERT…ON CONFLICT per 5k batch (row upserts timed out at 5s over the network). createRun transaction timeout raised to 30s.
- Neon: logged in (free plan, org org-withered-art-69345243). Created project `freshroots-planner` id cool-silence-76446598, region aws-ap-southeast-1 (Singapore), Postgres 18, db `neondb`, branch `main`. vercel.json pins functions to sin1 to sit next to the DB.
- Vercel: project `freshroots-demand-planner` linked (.vercel/, gitignored) and GitHub repo connected, so pushes to dev deploy previews and main deploys production. `vercel link` added VERCEL_OIDC_TOKEN to .env.local and `.env*` to .gitignore; the gitignore line was removed (it hid .env.example).
- Phase 6 (partial): .github/workflows/ci.yml (npm ci, lint, test, build), green on dev (48s). `main` protection now requires the `lint-test-build` check + PR.
- Phase 7 (partial): skills/ (5 skills + 3 rubrics); README complete (setup, Monday flow, assumptions, limitations).
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
3. Push the 3 Vercel env vars from .env.local without printing them (`vercel env add NAME preview|production` piped from the file); push dev; smoke-test the preview (login, run engine, approve one); finish the final HANDOFF checklist.

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
- Merge dev → main (A2.5) when ready for production.

## Env vars
- DATABASE_URL — set (.env.local)
- DIRECT_URL — set (.env.local)
- DATA_DIR — set (.env.local)
- APP_PASSWORD — set (.env.local)
- VERCEL_OIDC_TOKEN — set (written by `vercel link`)
- Vercel project env vars (DATABASE_URL, DIRECT_URL, APP_PASSWORD) — set (Production + Preview, Secret)

## Verify state
- `git log -5 --oneline` and `git branch --show-current` (expect dev)
- `npx tsc --noEmit` (run `npx next typegen` first if .next is missing)
- `npm test` (after Phase 3)
- `npx prisma migrate status` (after Phase 2)

## Known issues
- Preview and Production share the same Neon database (branch `main`). Before real use, create a Neon `preview` branch and point the Preview env vars at it.
- SECURITY: the Neon neondb_owner password (2nd one) was displayed in the chat transcript via `!` commands. Rotate it before production (Neon console → Roles → Reset password), then update .env.local and Vercel env vars.
- `tsc` needs `npx next typegen` first on a fresh clone (LayoutProps comes from generated route types).
- npm audit reports some advisories from the scaffold; not addressed (no `--force`).
