# Rubric: Code quality

Score each 0 (missing), 1 (partial) or 2 (solid). Target ≥ 16/20 before merging to `main`.

| # | Check | How to verify |
|---|---|---|
| 1 | Engine is pure (no DB, fetch, Date.now in decisions) | `grep -rn "prisma\|fetch(" src/lib/engine` returns nothing |
| 2 | Every threshold comes from `src/config/engine.ts` | No numeric literals for rules in `evaluate.ts` beyond 0/1 |
| 3 | Tests pass, including spec Ex1–Ex4 | `npm test` |
| 4 | Types are strict, no `any` | `npx tsc --noEmit`; `grep -rn ": any" src` |
| 5 | Lint is clean | `npm run lint` |
| 6 | API errors use one shape `{error:{code,message}}` with correct status | curl a 400, 404 and 409 |
| 7 | Inputs validated with zod at every route | each `route.ts` uses a schema |
| 8 | Logs are structured JSON, with no secrets | inspect `logger.*` calls |
| 9 | No secrets in the repo | `git grep -n "postgres://\|APP_PASSWORD="` shows only `.env.example` |
| 10 | Build works without a DB (CI) | `npm run build` with no `.env.local` |
