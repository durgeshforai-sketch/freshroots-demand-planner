# Skill: Schema evolution (Prisma 7 + Neon)

**Purpose:** change the database schema without losing data.

## Steps
1. Edit `prisma/schema.prisma`. Prefer **additive** changes: new nullable columns and new tables.
2. `npx prisma format && npx prisma validate`.
3. `npx prisma migrate dev --name <short_change>` against the dev database (uses `DIRECT_URL` via `prisma.config.ts`).
4. Review the SQL in `prisma/migrations/*/migration.sql`. If you see `DROP` or a type change on a column with data, stop and ask.
5. Update `csvLoader.ts`, `runInput.ts`, `planning.ts` and the zod schemas as needed. Then run `npm test && npm run build`.
6. Production: run `npx prisma migrate deploy` locally against Neon prod **before** the deploy that needs it. Never run it in the Vercel build.

## Notes
- Prisma 7 keeps connection URLs out of `schema.prisma`: CLI uses `prisma.config.ts` (DIRECT_URL), the app uses `src/lib/db.ts` (DATABASE_URL, pooled).
- Generated client lives in `src/generated/prisma` (gitignored, made by `postinstall`).

## Example prompts
- "Add unitPrice to InventorySnapshot history so we can value overstock over time."
- "Add a Supplier table with lead times and link it to Sku. Keep it backwards compatible."
- "Rename Recommendation.qty to recommendedQty without losing data."
