# HANDOFF

**Last updated:** 2026-10-22 (session 1)

**Current position:** Phase 1 — Project setup. Waiting on opening questions (A2.1).

## Done
- Created CLAUDE.md, HANDOFF.md, docs/BUILD_SPEC.md (Part B verbatim) in provisional root `./freshroots-planner/`.
- Inspected tools: node v24.15.0, npm 11.12.1, git 2.50.1, gh 2.94.0 (logged in as durgeshforai-sketch), Vercel CLI 63.1.0 (logged in as durgeshforai-sketch). neonctl and psql are not installed. No GitHub/Neon/Vercel MCP tools are present.
- Read the case PDF and all 5 CSVs (see Decisions).

## In progress
- Waiting for answers: project root path, DATA_DIR path, GitHub repo name.
- Files touched: CLAUDE.md, HANDOFF.md, docs/BUILD_SPEC.md.

## Next 3 actions
1. Move these 3 files to the confirmed project root if it differs, then scaffold Next.js + Prisma + Vitest there.
2. git init, commit on `main`, create `dev`, create the GitHub repo with gh, push both branches, try branch protection.
3. Write scripts/inspect-data.ts and run Step 0, then stop for mapping OK (A2.3).

## Decisions made
- Stack is fixed per spec.
- Neon: neonctl is not installed. Plan: run it via `npx neonctl` (project-local, no global install); if it isn't authenticated, give the user the login command.
- Early data observations (for Step 0): the CSVs are calendar (month-level festival flags, no festival names or dates), current_inventory (onHand only, no onOrder), distributor_master (4 distributors, two of them outside Maharashtra/Goa), sku_master (15 SKUs; Perishability High/Low; Standard_Reorder_Qty; a single Distributor_ID per SKU; no price, case pack or lead time), weekly_sales (SKU × ISO week only, no distributor column; W27–W42 2026; 16 weeks).

## Waiting on me
- A2.1 opening questions (root path, DATA_DIR, repo name).

## Env vars
- DATABASE_URL — not set
- DIRECT_URL — not set
- DATA_DIR — not set
- APP_PASSWORD — not set

## Verify state
- `ls` in the project root (expect CLAUDE.md, HANDOFF.md, docs/BUILD_SPEC.md)
- `git log -5 --oneline` (after Phase 1)
- `npm test` (after Phase 3)
- `npx prisma migrate status` (after Phase 2)

## Known issues
- No git repo yet.
