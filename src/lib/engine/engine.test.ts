import { describe, expect, it } from "vitest";
import { engineConfig } from "@/config/engine";
import { isoWeekToMonday, isoDate } from "@/lib/csv";
import {
  addDays,
  computeKillMetrics,
  decideSku,
  festivalFactorFor,
  latestCompleteWeekStart,
  preplacementCheck,
  roundToPack,
  runEngine,
  type SkuInput,
  type SkuStats,
  type WeekPoint,
} from "./index";

// ---------- helpers ----------
const cfg = { ...engineConfig, qStdSource: "avgWeeks" as const }; // spec tests: Q_std = 4 × AVG12

function stats(avg12: number, avg4: number, surgeBothWeeks: boolean): SkuStats {
  // "Surge both weeks": the previous week's averages equal the current ones.
  // Otherwise the previous week's AVG4 sits at AVG12 (no surge last week).
  return {
    avg12,
    avg4,
    avg12Prev: avg12,
    avg4Prev: surgeBothWeeks ? avg4 : avg12,
    latestWeek: "2026-10-12",
    latestUnits: avg4,
    historyWeeks: 16,
    missingWeeks: [],
  };
}

function sku(over: Partial<SkuInput> = {}): SkuInput {
  return {
    code: "T1",
    name: "Test SKU",
    isPerishable: false,
    casePack: 1,
    leadTimeWeeks: null,
    unitPrice: null,
    weeks: [],
    distributors: [],
    onHand: 0,
    onOrder: 0,
    ...over,
  };
}

const ctx = (festivalFactor = 1, runDate = "2026-10-19") => ({ runDate, festivalFactor, eventFlags: [], cfg });

/** n complete weeks ending the week before runDate, oldest first. */
function weeks(runDate: string, units: number[]): WeekPoint[] {
  const latest = latestCompleteWeekStart(runDate);
  return units.map((u, i) => ({ weekStart: addDays(latest, -7 * (units.length - 1 - i)), units: u }));
}

// ---------- required spec examples (case pack = 1) ----------
describe("spec examples", () => {
  it("Ex1 general: surge both weeks, low cover → STOCKOUT_RISK, Q = 6,000", () => {
    const r = decideSku(sku({ onHand: 4500, onOrder: 500 }), stats(1000, 1300, true), ctx());
    expect(r.surgeConfirmed).toBe(true);
    expect(r.demandRate).toBe(1300);
    expect(r.flag).toBe("STOCKOUT_RISK");
    expect(r.qty).toBe(6000);
  });

  it("Ex2 perishable: → STOCKOUT_RISK, Q = 600 (capped by 4-week max)", () => {
    const r = decideSku(sku({ isPerishable: true, onHand: 1100, onOrder: 300 }), stats(500, 520, false), ctx());
    expect(r.flag).toBe("STOCKOUT_RISK");
    expect(r.qty).toBe(600);
  });

  it("Ex3 festival: run 2026-10-12, Diwali 2026-11-08 → F = 1.25, OK", () => {
    const { factor } = festivalFactorFor("2026-10-12", [{ name: "Diwali", startDate: "2026-11-08", endDate: "2026-11-08" }], cfg);
    expect(factor).toBe(1.25);
    const r = decideSku(sku({ onHand: 20000, onOrder: 0 }), stats(2000, 2700, true), ctx(factor, "2026-10-12"));
    expect(r.flag).toBe("OK");
    expect(r.qty).toBe(0);
  });

  it("Ex4: surge both weeks, IP 15,000 → OVERSTOCK", () => {
    const r = decideSku(sku({ onHand: 15000, onOrder: 0 }), stats(800, 1000, true), ctx());
    expect(r.flag).toBe("OVERSTOCK");
    expect(r.qty).toBe(0);
  });
});

// ---------- rules and edge cases ----------
describe("decision rules", () => {
  it("Ex3 without the festival would have been a surge", () => {
    const r = decideSku(sku({ onHand: 20000, onOrder: 0 }), stats(2000, 2700, true), ctx(1));
    expect(r.flag).toBe("HIGH_DEMAND");
    expect(r.qty).toBe(Math.min(8000 * 1.5, 14 * 2700 - 20000));
  });

  it("surge on the latest week only → WATCH", () => {
    const r = decideSku(sku({ onHand: 10000, onOrder: 0 }), stats(1000, 1300, false), ctx());
    expect(r.flag).toBe("WATCH");
  });

  it("missing on-order is treated as 0 and labelled", () => {
    const r = decideSku(sku({ onHand: 8000, onOrder: null }), stats(1000, 1000, false), ctx());
    expect(r.flag).toBe("OK");
    expect(r.onOrderAvailable).toBe(false);
    expect(r.reason).toContain("on-order unavailable");
  });

  it("E7: standard qty too small to restore min cover → EXCEPTION, no auto qty", () => {
    const r = decideSku(
      sku({ onHand: 900, onOrder: 0, standardReorderQty: 500 }),
      stats(215, 261, false),
      { ...ctx(1.25), cfg: engineConfig }, // master Q_std
    );
    expect(r.flag).toBe("EXCEPTION");
    expect(r.exceptions.map((e) => e.code)).toContain("E7");
    expect(r.qty).toBe(0);
    expect(r.suggestedQty).toBe(500);
  });

  it("E1: fewer than 12 weeks of history", () => {
    const r = decideSku(sku({ onHand: 8000 }), { ...stats(1000, 1000, false), historyWeeks: 8 }, ctx());
    expect(r.flag).toBe("EXCEPTION");
    expect(r.exceptions[0]!.code).toBe("E1");
  });

  it("E3: active event flag for the SKU", () => {
    const r = decideSku(sku({ onHand: 8000 }), stats(1000, 1000, false), {
      ...ctx(),
      eventFlags: [{ skuCode: "T1", startDate: "2026-10-01", endDate: "2026-10-31", note: "Competitor scheme in Pune" }],
    });
    expect(r.exceptions.map((e) => e.code)).toEqual(["E3"]);
  });

  it("E5 and E6 fire when lead time and price are known", () => {
    const r = decideSku(
      sku({ onHand: 1000, onOrder: 0, leadTimeWeeks: 8, unitPrice: 200 }),
      stats(1000, 1000, false),
      ctx(),
    );
    const codes = r.exceptions.map((e) => e.code);
    expect(codes).toContain("E5");
    expect(codes).toContain("E6"); // 4,000 × ₹200 = ₹8 lakh
  });

  it("rounds up for general and down for perishables", () => {
    expect(roundToPack(101, 12, false)).toBe(108);
    expect(roundToPack(101, 12, true)).toBe(96);
    expect(roundToPack(-5, 12, false)).toBe(0);
  });
});

describe("runEngine over weekly data", () => {
  const runDate = "2026-10-19";

  it("uses complete weeks only and computes AVG4/AVG12 from the series", () => {
    const series = weeks(runDate, [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]);
    const res = runEngine({ runDate, festivals: [], eventFlags: [], skus: [sku({ weeks: series, onHand: 800, distributors: [{ code: "D1", weeks: series }] })] }, cfg);
    expect(res.status).toBe("COMPLETED");
    expect(res.results[0]!.avg12).toBe(100);
    expect(res.results[0]!.flag).toBe("OK");
  });

  it("E2: a large distributor swings ≥50%", () => {
    const steady = weeks(runDate, Array(16).fill(100));
    const swing = weeks(runDate, [...Array(12).fill(100), 20, 20, 20, 20]);
    const total = steady.map((w, i) => ({ weekStart: w.weekStart, units: w.units + swing[i]!.units }));
    const res = runEngine({ runDate, festivals: [], eventFlags: [], skus: [sku({ weeks: total, onHand: 1500, distributors: [{ code: "D1", weeks: steady }, { code: "D2", weeks: swing }] })] }, cfg);
    expect(res.results[0]!.exceptions.map((e) => e.code)).toContain("E2");
  });

  it("E4: a missing week is a data problem", () => {
    const series = weeks(runDate, Array(16).fill(100)).filter((_, i) => i !== 10);
    const res = runEngine({ runDate, festivals: [], eventFlags: [], skus: [sku({ weeks: series, onHand: 800 })] }, cfg);
    expect(res.results[0]!.exceptions.map((e) => e.code)).toContain("E4");
  });

  it("guardrail halts the run and saves no recommendations", () => {
    // Per-SKU Q is capped at 1.5× Q_std, so at the default 1.5× limit the guardrail only catches
    // bugs, config changes or rounding. Lower the limit to prove the halt path works.
    const surge = weeks(runDate, [...Array(12).fill(100), 300, 300, 300, 300]);
    const s1 = sku({ code: "A", weeks: surge, onHand: 1000, distributors: [] }); // STOCKOUT, Q = 1.5× Q_std, no E7
    const res = runEngine({ runDate, festivals: [], eventFlags: [], skus: [s1] }, { ...cfg, guardrailMultiple: 1.2 });
    expect(res.status).toBe("HALTED");
    expect(res.results).toHaveLength(0);
    expect(res.haltReason).toMatch(/Guardrail/);
  });
});

describe("pre-placement check and kill metrics", () => {
  it("holds when the latest week moved ≥20% or a top distributor cut ≥30%", () => {
    const hold = preplacementCheck({
      avg4AtRecommendation: 100,
      latestWeekUnits: 75,
      distributors: [{ code: "D1", baselineAvg4: 60, latestUnits: 40 }],
      newEventFlags: [],
    });
    expect(hold.result).toBe("HOLD");
    expect(hold.triggers).toHaveLength(2);
    const ok = preplacementCheck({ avg4AtRecommendation: 100, latestWeekUnits: 95, distributors: [], newEventFlags: [] });
    expect(ok.result).toBe("PROCEED");
  });

  it("override rate warns above 30% and exception rate is banded vs 15–20%", () => {
    const m = computeKillMetrics({ decisions: { approve: 6, override: 3, reject: 1 }, recommendations: 20, exceptions: 5 });
    expect(m.overrideRate).toBeCloseTo(0.4);
    expect(m.overrideWarn).toBe(true);
    expect(m.exceptionBand).toBe("above");
  });
});

describe("dates", () => {
  it("ISO week labels map to Mondays and runs use the previous complete week", () => {
    expect(isoDate(isoWeekToMonday("2026-W42")!)).toBe("2026-10-12");
    expect(isoDate(isoWeekToMonday("2026-W27")!)).toBe("2026-06-29");
    expect(latestCompleteWeekStart("2026-10-19")).toBe("2026-10-12");
    expect(latestCompleteWeekStart("2026-10-18")).toBe("2026-10-05");
  });
});
