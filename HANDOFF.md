# HANDOFF

**Last updated:** 2026-10-22 (session 1, end)

**Current position:** BUILD COMPLETE on `dev`. Phases 1–7 are done and verified. The only open item is the production release (merge dev → main), which waits on the user (A2.5).

## Build checklist
- [x] Phase 1: scaffold, GitHub repo, `main` + `dev`, branch protection (PR + green CI required on main)
- [x] Phase 2: Step 0 inspection, mapping confirmed, Neon project, migration, idempotent ingest, data-quality.md
- [x] Phase 3: pure engine (19/19 tests incl. spec Ex1–Ex4), service layer, all API routes, local curl smoke test
- [x] Phase 4: password gate (src/proxy.ts), dashboard, run review, exceptions, SKU page; build passes
- [x] Phase 5: Vercel linked, env vars set, preview deployed and smoke-tested
- [ ] Phase 5: production. Merge dev → main (user decision, A2.5)
- [x] Phase 6: CI (lint, test, build) green; JSON logs for runs, decisions, guardrail halts, auth, pre-placement
- [x] Phase 7: 5 skills + 3 rubrics in skills/, README complete

## Done
- Preview smoke test PASS (https://freshroots-demand-planner-akn9p2v1n.vercel.app, behind Vercel Deployment Protection; use `vercel curl`): health 200 (DB 221ms), unauthenticated 401, login 200, POST /api/runs 201 (run 4), APPROVE rec 56 (SKU011) 201, metrics 200; pages /, /runs/4, /exceptions, /skus/SKU011 all 200.
- Vercel env vars DATABASE_URL, DIRECT_URL, APP_PASSWORD set for Production + Preview as Secret (piped from .env.local, never printed). vercel.json pins functions to sin1.
- Local smoke test PASS (npm run dev + Neon), covering every endpoint:
  - health 200; unauthenticated 401; login 200, bad password 401; page without cookie 307 → /login.
  - runs: bad date 400, valid 201, list 200, 999 → 404, abc → 400. recommendations filters 200, bad flag 400. exceptions, metrics, skus 200; unknown SKU 404.
  - decision: APPROVE on EXCEPTION 409; OVERRIDE without qty 400; OVERRIDE+AGREE 400; bad action or JSON 400; APPROVE 201; re-decide 409.
  - pre-placement: PENDING 409; APPROVED → PROCEED; after a DIST002 flag → HOLD; owner decision needs a named owner (400 without, 201 with).
  - flags: validation 400s; distributor flag 201, and the next run routes DIST002's 4 SKUs to E3.
- Neon: project `freshroots-planner` (cool-silence-76446598), aws-ap-southeast-1, PG 18, db `neondb`. Migration 20261022112544_init applied. Ingest: Sku 15, Distributor 4, WeeklySale 240, InventorySnapshot 15, Festival 6, 0 rejects, about 4s, idempotent.
- Engine dry run 2026-10-19: STOCKOUT 2 (SKU004, SKU011), OVERSTOCK 2 (SKU006, SKU007), OK 8, EXCEPTION 3 (E7: SKU001, SKU003, SKU013); exception rate 20%; guardrail 0.20× (units).
- Stack: Next.js 16.4.2, Prisma 7.10.1 + @prisma/adapter-neon, Tailwind 4, Vitest 5, zod 4. Repo https://github.com/durgeshforai-sketch/freshroots-demand-planner (public).

## In progress
- Nothing. The local dev server may still be running from the Browser pane (`freshroots-dev`, port 3000).

## Next 3 actions
1. User: rotate the Neon password (see Known issues), then update .env.local and re-run the Vercel env push (`vercel env add NAME production|preview --sensitive --force`, piped from the file).
2. User OK → open PR dev → main, wait for green CI, merge, and smoke-test production (login, run engine, approve one).
3. Raghav review: walk through README "Assumptions Raghav must confirm" and update src/config/engine.ts via skills/engine_rules_change.md.

## Decisions made
- Root: `<case folder>/freshroots-planner`. DATA_DIR = the case folder (outside the repo).
- Prisma pinned to 7.10.1 (npm `latest` is 8.0.0-rc). Prisma 7 has no url/directUrl in schema: prisma.config.ts uses DIRECT_URL (CLI); src/lib/db.ts uses DATABASE_URL (pooled, Neon adapter, created lazily so build/CI need no DB).
- Next 16: proxy.ts replaces middleware; async params; cacheComponents disabled (all pages are live data).
- MAPPING (confirmed by user): Q_std = Standard_Reorder_Qty, falling back to 4×AVG12 (`qStdSource`). Festival = month window overlapping [runDate, +28d]. WeeklySale.distributor derived from sku_master. No price → guardrail in units, E6 skipped. casePack 1; no lead time → E5 skipped; no on-order → 0, labelled.
- Surge = rolling AVG4 > 1.2×D on the latest week and the week before. EXCEPTION → qty 0, engine figure kept in the reason. E7 only for STOCKOUT/HIGH_DEMAND. E2 either direction. E3 = flag active on the run date for the SKU or its distributor.
- Guardrail: Σ auto qty vs Σ Q_std. Finding: per-SKU cap means 1.5× rarely trips; README suggests 1.2×.
- Decisions only on PENDING; APPROVE refused on EXCEPTION; OVERRIDE needs newQty, not AGREE. Override rate = (override + reject) ÷ decisions. decidedBy defaults to "Raghav Kulkarni".
- Pre-placement: POST runs the check; POST {owner, ownerDecision} records the owner's call on the latest HOLD.
- Sales ingest: one INSERT…ON CONFLICT per 5k-row batch. createRun transaction timeout 30s.
- Neon + Vercel functions both in Singapore.

## Waiting on me
- Rotate the Neon password (security, see below).
- Approve merging dev → main for production (A2.5).

## Env vars
- DATABASE_URL — set (.env.local; Vercel Production + Preview)
- DIRECT_URL — set (.env.local; Vercel Production + Preview)
- APP_PASSWORD — set (.env.local; Vercel Production + Preview)
- DATA_DIR — set (.env.local only; not needed on Vercel)
- VERCEL_OIDC_TOKEN — set (.env.local, written by `vercel link`)

## Verify state
- `git log -5 --oneline && git branch --show-current` (expect dev, clean tree)
- `npx next typegen && npx tsc --noEmit && npm run lint`
- `npm test` (expect 19 passed)
- `npx prisma migrate status` (expect "Database schema is up to date")
- `npm run data:dry-run` (expect STOCKOUT 2 / OVERSTOCK 2 / OK 8 / EXCEPTION 3 with no event flags)
- `gh run list --limit 3` (expect CI success on dev)
- `vercel ls freshroots-demand-planner | head -5`

## Known issues
- SECURITY: the current Neon neondb_owner password appeared in the chat transcript. Rotate it before production (Neon console → Branches → main → Roles → Reset password), then update .env.local and the Vercel env vars.
- Preview and Production share one Neon database. Create a Neon `preview` branch for Preview before real use.
- The DB contains smoke-test data: runs 1–4, decisions and pre-placement checks, and event flag #1 (DIST002 "Competitor scheme in Pune, Nashik", 15 Oct–15 Nov 2026), which makes DIST002's SKUs E3 exceptions. Clear these before a demo if you want a clean slate.
- Vercel's first deployment (from dev) was marked Production before env vars existed. It's superseded once main deploys.
- `tsc` on a fresh clone needs `npx next typegen` first. npm audit advisories from the scaffold have not been addressed.
