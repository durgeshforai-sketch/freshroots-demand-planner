# Rubric: Data modelling

Score 0/1/2 each. Target ≥ 14/16.

| # | Check | Notes |
|---|---|---|
| 1 | Natural keys for master data (`Sku.code`, `Distributor.code`) | matches SAP IDs |
| 2 | Uniqueness enforced where ingest upserts | WeeklySale (sku, distributor, weekStart); InventorySnapshot (sku, asOfDate); Festival (name, startDate) |
| 3 | Weeks stored as Monday `date` values, not ISO strings | conversion in `csvLoader.ts` |
| 4 | Optional business fields are nullable, not faked | unitPrice, casePack, leadTimeWeeks, onOrder |
| 5 | Every engine output is traceable | Run.configSnapshot, Recommendation numbers + reason, RecException rows |
| 6 | Human decisions are an append-only log | Decision rows; Recommendation.status is derived from the latest decision |
| 7 | Indexes match the queries | WeeklySale (sku, weekStart); Recommendation (runId, flag); RecException (runId, code) |
| 8 | Migrations are additive and reviewed | no destructive SQL without sign-off |
