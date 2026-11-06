# Rubric: Case alignment (does the app still match Deepa's brief?)

Each item is **pass/fail**. Any fail blocks a merge to `main`.

| # | Check | How to verify |
|---|---|---|
| 1 | **The buying decision stays human.** No code path creates a purchase order or calls Zoho/SAP to place one | `grep -rni "zoho\|purchase" src` finds only text; recommendations start `PENDING` |
| 2 | **Exceptions route to Raghav.** EXCEPTION has qty 0 and APPROVE is refused (409) | test plus curl `POST /decision {action:"APPROVE"}` on an exception |
| 3 | **The guardrail works.** Ratio above `guardrailMultiple` → Run HALTED, 0 recommendations saved, red "manual planning" banner | `engine.test.ts` guardrail test; dashboard banner |
| 4 | **Kill metrics are visible** on `/`: override rate vs 30%, exception rate vs 15–20%, the ₹34L kill rule | open `/` |
| 5 | **Pre-placement check** exists, can HOLD, and needs a named owner to proceed, reduce or cancel | `POST /preplacement-check` |
| 6 | **Rules are Raghav's**, documented and in config. No ML | `src/config/engine.ts`; README assumptions list |
| 7 | **Explainability.** Every recommendation has a one-sentence reason a planner can read aloud | `/runs/[id]` "Why" column |
| 8 | **Data gaps are disclosed**: missing on-order, price, lead time, festival dates | run warnings on `/`; `data-quality.md` |
| 9 | **Cadence beats the monthly cycle.** A weekly run takes minutes, not 2 days | time `POST /api/runs` |
