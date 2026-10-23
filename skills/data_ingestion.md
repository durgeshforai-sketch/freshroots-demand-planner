# Skill: Data ingestion

**Purpose:** load or refresh the SAP CSV exports into Postgres safely and repeatably.

## Steps
1. Put the five CSVs in the folder named by `DATA_DIR` (`.env.local`; quote the path, it has spaces).
2. `npm run data:inspect`: confirm columns, types, week range and per-SKU history. If a column name changed, update `src/config/columnMap.ts` **and** `src/lib/services/csvLoader.ts` together.
3. `npm run data:dry-run`: run the engine straight from the CSVs, with no DB writes. Sanity-check the flags.
4. `npm run data:ingest`: idempotent upserts. Re-running it never duplicates rows.
5. Read `data-quality.md` (counts, rejects, missing fields, footprint notes). Any reject needs an explanation before the weekly run.
6. `npm run data:check` to confirm row counts per table.

## Rules
- Never hand-edit rows in the DB. Fix the CSV or the loader.
- Negative stock is **kept** so the engine raises E4. Negative sales are rejected.
- New optional columns (`Unit_Price`, `Case_Pack`, `Lead_Time_Weeks`, `Units_On_Order`, `Distributor_ID` on sales) are already read if present. Adding them switches on E5, E6, rupee guardrails and real E2.

## Example prompts
- "New SAP export landed in DATA_DIR. Inspect it, dry-run, ingest, and summarise data-quality.md."
- "Sales now include a Distributor_ID column. Update the mapping and loader, and show me how E2 changes."
- "Ingest rejected 12 rows. Explain each reject and propose a fix."
