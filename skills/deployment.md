# Skill: Deployment (Vercel + Neon)

**Purpose:** ship `dev` to preview and `main` to production without surprises.

## Steps
1. `npm test && npm run build` locally. CI must be green on `dev`.
2. DB first: `npx prisma migrate status`, then `npx prisma migrate deploy` (locally, against the target Neon branch).
3. Vercel env vars (Project → Settings → Environment Variables): `DATABASE_URL` (pooled), `DIRECT_URL`, `APP_PASSWORD`. Set for Preview and Production. Never paste them into chat or commit them.
4. Push `dev` for a preview deployment, then smoke-test: `/api/health`, log in, run the engine, approve one recommendation.
5. Production: open a PR from `dev` to `main`. **Merging is a human decision.** After merge, Vercel deploys `main`.
6. Roll back with Vercel "Promote previous deployment". DB migrations are forward-only, so write a new migration to undo.

## Example prompts
- "Deploy dev to a preview and run the smoke test checklist."
- "The preview shows DB_UNAVAILABLE on /api/health. Diagnose without printing secrets."
- "Prepare the PR from dev to main with a changelog since the last release."
