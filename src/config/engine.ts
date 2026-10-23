/**
 * Every engine threshold lives here. A snapshot of this object is saved on every Run.
 * Change values via the process in skills/engine_rules_change.md and re-run `npm test`.
 */
export const engineConfig = {
  version: "1.0.0",

  // Averages (complete Monday–Sunday weeks before the run date)
  avgShortWeeks: 4,
  avgLongWeeks: 12,
  minHistoryWeeks: 12, // E1 below this

  // Festival uplift
  festivalFactor: 1.25,
  festivalLookaheadDays: 28, // "within the next 4 weeks of the run date"

  // Surge test: AVG4 > surgeThreshold × D, on the latest week AND the week before
  surgeThreshold: 1.2,
  surgeMultiplier: 1.5, // s

  // Cover windows (weeks)
  cover: {
    general: { min: 6, max: 14 },
    perishable: { min: 3, max: 4 },
  },

  // Standard order quantity.
  // "master": Sku.standardReorderQty from sku_master.csv, falling back to qStdWeeks × AVG12 when blank.
  // "avgWeeks": always qStdWeeks × AVG12 (the spec's assumption).
  qStdSource: "master" as "master" | "avgWeeks",
  qStdWeeks: 4,
  defaultCasePack: 1,

  // Exceptions
  e2MinShare: 0.1, // distributor holds ≥10% of the SKU's 12-week volume
  e2MinSwing: 0.5, // and its AVG4 moves ≥50% vs its own AVG12 (either direction)
  e6MaxOrderValue: 500_000, // ₹5 lakh

  // Automatic guardrail: halt if total recommended > multiple × (every SKU ordering Q_std).
  // Compared in ₹ when every SKU has a unit price, otherwise in units.
  guardrailMultiple: 1.5,

  // Pre-placement check
  preplacement: {
    latestWeekDelta: 0.2, // latest week differs from AVG4 at recommendation by ≥20%
    distributorCut: 0.3, // any top-N distributor cut ≥30%
    topDistributors: 10,
  },

  // Kill metrics (reporting only; Deepa decides)
  killMetrics: {
    overrideRateWarn: 0.3,
    expectedExceptionRate: { min: 0.15, max: 0.2 },
    quarterlyLossKillRupees: 3_400_000, // ₹34 lakh
  },
};

export type EngineConfig = typeof engineConfig;
