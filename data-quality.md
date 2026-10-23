# Data quality report

Generated: 2026-10-22T11:26:30.991Z  
Source: `DATA_DIR` (5 CSV files)

## Rows read → loaded
| File | Rows read |
|---|---|
| distributor_master.csv | 4 |
| sku_master.csv | 15 |
| weekly_sales.csv | 240 |
| current_inventory.csv | 15 |
| calendar.csv | 24 |

| Table | Rows in DB |
|---|---|
| Sku | 15 |
| Distributor | 4 |
| WeeklySale | 240 |
| InventorySnapshot | 15 |
| Festival | 6 |

Sales weeks: 16 (2026-06-29 → 2026-10-12, week-start Mondays).

## Rejects (0)
None.

## Missing fields
- Sku.unitPrice — order value and E6 skipped; guardrail runs in units
- Sku.casePack — defaults to 1
- Sku.leadTimeWeeks — E5 skipped
- InventorySnapshot.onOrder — treated as 0, labelled 'on-order unavailable'
- WeeklySale.distributor — not in sales file; derived from sku_master.Distributor_ID
- Festival names/dates — calendar has month flags only
- Distributor.tier — not provided

## Notes
- Distributors outside the stated Maharashtra/Goa footprint (kept): DIST003 Karnataka, DIST004 Gujarat.
- No Goa distributor in the sample.
- Sample size: 15 SKUs / 4 distributors / 16 weeks vs ~400 SKUs / ~1,200 distributors / 3 years in production.
