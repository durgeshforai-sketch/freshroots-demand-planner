# Freshroots Demand Planner

A rules-based demand-planning assistant for Freshroots, built for the MESA case *Deepa's 90-Day Mandate*.

Freshroots loses **₹28–34 lakh a quarter** to planning errors (stockouts plus perishable write-offs). Raghav, the senior demand planner, spends about 2 days a month moving SAP data into Excel, so forecasts are 3–4 weeks old by the time procurement acts on them. His written rules cover 80–85% of decisions.

This app automates the data work and those rules. **The buying decision stays human.** The engine recommends, Raghav approves or overrides, and procurement places the order. The engine is deterministic rules, not machine learning.

The ₹15 lakh budget pays back if planning-error costs fall 11–13% in year one.

## How it works

```
SAP CSV exports ──► ingest ──► Postgres (Neon) ──► rules engine ──► recommendations ──► Raghav decides ──► pre-placement check ──► procurement (Zoho)
                                                     │                    │
                                                     ├─ E1–E7 exceptions → Raghav (no auto qty)
                                                     └─ guardrail → HALT run, manual planning
```

| Step | Rule (all values in `src/config/engine.ts`) |
|---|---|
| Averages | AVG4 / AVG12 over complete Monday–Sunday weeks before the run date, planned at SKU level |
| Festival | F = 1.25 if a festival month or date falls in the next 4 weeks, else 1.00. D = AVG12 × F |
| Surge | AVG4 > 1.2 × D for the latest week **and** the week before. Then R = AVG4, otherwise R = D |
| Cover | WOC = (on hand + on order) ÷ R. General SKUs 6–14 weeks, perishable 3–4 weeks |
| Flags (first match wins) | EXCEPTION → OVERSTOCK (pause) → STOCKOUT_RISK (reorder) → HIGH_DEMAND (1.5×) → WATCH → OK |
| Quantity | Q = min(Q_std × s, max × R − IP). s = 1.5 on a confirmed surge. Round up for general SKUs, down for perishables |
| Exceptions | E1 new SKU · E2 distributor swing · E3 market-event flag · E4 data problem · E5 lead time ≥ min cover · E6 order > ₹5 lakh · E7 floor breach |
| Guardrail | If the run total exceeds 1.5× "every SKU orders Q_std", the run is HALTED and nothing is saved |
| Pre-placement | Before ordering, HOLD if the latest week moved ≥20%, a top-10 distributor cut ≥30%, or a new event flag exists. A named owner then decides to proceed, reduce or cancel |
| Kill metrics | Override rate (warns above 30%), exception rate (expected 15–20%), and the kill rule: quarterly losses above ₹34 lakh vs Raghav's manual plan. These are reported only; Deepa decides |

## Stack
Next.js 16 (App Router, TypeScript) · Prisma 7 + Neon Postgres (`@prisma/adapter-neon`) · Tailwind 4 · Vitest · Vercel · GitHub Actions.

## Setup

```bash
npm install                      # also runs prisma generate
cp .env.example .env.local       # then fill in the values yourself
```

| Variable | What |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (app runtime) |
| `DIRECT_URL` | Neon **direct** connection string (Prisma migrations, via `prisma.config.ts`) |
| `DATA_DIR` | Folder with the 5 CSVs. Quote it, the path has spaces |
| `APP_PASSWORD` | Shared password for the login gate |

```bash
npx prisma migrate dev --name init   # create tables
npm run data:inspect                 # Step 0: look at the CSVs
npm run data:ingest                  # load (idempotent) and write data-quality.md
npm run data:check                   # row counts per table
npm run dev                          # http://localhost:3000
npm test                             # engine tests (incl. spec Ex1–Ex4)
npm run data:dry-run                 # engine straight from CSVs, no DB
```

**Login is a shared-password gate, not real authentication.** A signed cookie proves you typed `APP_PASSWORD`, nothing more. There are no user accounts, roles or audit of *who* is logged in. "Decided by" is whatever name the form sends. Before wider rollout, replace this with SSO.

## Monday morning for Raghav

1. The SAP export lands in `DATA_DIR`. Run `npm run data:ingest` (IT can schedule this) and skim `data-quality.md` for rejects.
2. Open the app and click **Run engine**. The run date defaults to the latest inventory snapshot.
3. If the dashboard shows a **red guardrail banner**, plan manually this week and tell Deepa.
4. On `/runs/<id>`, filter to **Exception** first. Each one gives the reason it needs your judgment, plus the engine's figure for reference. Use **Decide qty** or **Reject**.
5. Then work through **Stockout risk**, **High demand** and **Overstock**. Read the one-line *Why*. **Approve**, or **Override** with a reason code.
6. Before procurement places an order, run the **Pre-placement check**. A HOLD needs a named owner to proceed, reduce or cancel.
7. If you hear about a competitor scheme or local event, add an **event flag** with `POST /api/flags`. The SKU becomes an E3 exception in the next run.
8. Deepa reviews the dashboard: override rate, exception rate and the kill rule.

## Assumptions Raghav must confirm

| Assumption | Current setting | Why it matters |
|---|---|---|
| Q_std (standard order) | `Standard_Reorder_Qty` from sku_master, falling back to 4 × AVG12 (`qStdSource`) | Several standard quantities are far below a month of demand, so E7 fires (e.g. Mango Drink: 500 vs ≈860) |
| Festival window | Any flagged month overlapping the next 28 days | The calendar has month flags only. Which festivals do "October, November, March" mean? Diwali (8 Nov 2026), Gudi Padwa (March)? |
| Ganesh Chaturthi | **Not flagged** (September) | It's the biggest festival in Maharashtra. Should September get the uplift too? |
| Festival vs surge | Uplift raises D, which raises the surge bar | With the October uplift, Mango Drink's +21% is no longer a surge |
| Surge persistence | Two consecutive weeks | One week → WATCH only |
| E2 threshold | Distributor with ≥10% share moving ≥50% | Sales have no distributor column, so E2 currently uses the SKU's own total |
| E6 threshold | Order value > ₹5 lakh | Inactive until unit prices are loaded |
| Guardrail | 1.5× all-SKUs-at-Q_std, in units while prices are missing | Each SKU is already capped at 1.5×Q_std, so at 1.5× this mostly catches bugs, bad data or config errors. Consider 1.2× |
| Override rate | (overrides + rejects) ÷ decisions | Confirm Deepa counts rejects as overrides |

## Known limitations
- **Weekly data means one meaningful run per week.** Extra runs in the same week give the same answer.
- **On-order quantity is missing**, so inventory position equals on hand. Outputs are labelled "on-order unavailable". This overstates stockout risk for SKUs with open POs in Zoho.
- No unit price, case pack or lead time in the CSVs: E5 and E6 are skipped, case pack = 1, and the guardrail runs in units.
- Sales are SKU × week only. The distributor is derived from sku_master (one per SKU).
- Two sample distributors are in Karnataka and Gujarat, outside the stated Maharashtra/Goa footprint. They're kept and noted in `data-quality.md`.
- The sample has 15 SKUs, 4 distributors and 16 weeks. Production is about 400 SKUs, 1,200 distributors and 3 years. Ingest is batched, but expect to move to `createMany` or COPY for full volume.
- The 15–20% judgment cases (launches, unusual distributors, one-off events) are routed, not solved.

## Repo map
- `src/lib/engine/`: pure rules engine and tests
- `src/config/`: engine thresholds, column map, reason codes
- `src/lib/services/`: CSV loader, DB service layer
- `src/app/api/`: route handlers
- `src/app/`: pages
- `scripts/`: inspect, ingest, check, dry-run
- `skills/`: how-to guides and rubrics for future changes
- `docs/BUILD_SPEC.md`: full specification
- `HANDOFF.md`: current state
