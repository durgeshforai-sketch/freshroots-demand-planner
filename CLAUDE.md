# Freshroots Demand Planner

## Project summary
1. Freshroots (regional FMCG, Maharashtra + Goa, ~400 SKUs, ~1,200 distributors) — MESA case "Deepa's 90-Day Mandate".
2. We chose Demand Planning: planning errors cost ₹28–34L/quarter; Raghav's documented rules cover 80–85% of decisions.
3. The app automates SAP-export data work plus Raghav's rules as a deterministic engine (no ML), and produces weekly recommendations.
4. The buying decision stays human: the engine recommends, Raghav approves/overrides, procurement places the order.
5. Safety: exceptions E1–E7 routed to Raghav, an automatic guardrail halt, a pre-placement check, and kill metrics for Deepa.

## Operating mode (Part A, short form)
- **Autonomy:** do routine work without asking (files, project-local deps, scripts, tests, commits on `dev`, dev servers). Inspect tools first; install only what's missing, project-locally.
- **Fixed stack:** Next.js App Router + TypeScript, Prisma, Postgres on Neon, Vercel, npm, GitHub (`main` = prod, `dev` = development). Don't re-decide it. Use current stable versions you've checked.
- **Use MCP/CLI** for GitHub/Neon/Vercel when authenticated; if login is needed, give the user the single login command.
- **Work continuously** through phases; log a short checklist after each.
- **Stop only for:** (1) opening questions; (2) secrets — name the variable and file, the user pastes values; never print, request in chat, or commit a secret; (3) Step 0 data mapping OK; (4) actions outside the project folder (sudo, global installs, shell profiles, deletes outside root); (5) irreversible/costly actions (force-push, history rewrite, dropping tables with data, merge to `main`, paid plans); (6) tests still failing after 3 fix attempts.
- **Handoff:** update `HANDOFF.md` after EVERY completed task, then commit `chore: checkpoint — <task>`. Update it before any long-running step or `/compact`. Keep it under 150 lines, newest first; env vars as names only.
- **Progress log:** one line per action in chat; detail goes in HANDOFF.md.

## Full spec
Part B (build specification) lives in `docs/BUILD_SPEC.md`. Read it before changing engine, schema, API or UI.

## Resume rule
If the user types `continue`, run the Verify-state commands in HANDOFF.md, report in 3 lines whether saved state matches reality, fix HANDOFF.md if not, then continue from Next 3 actions.

@HANDOFF.md

## Next.js version note
@AGENTS.md
