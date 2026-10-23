import type { EngineConfig } from "@/config/engine";
import { addDays, latestCompleteWeekStart } from "./dates";
import type { SkuStats, WeekPoint } from "./types";

/** The `n` week-start dates ending at `latest`, newest first. */
export function weekWindow(latest: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(latest, -7 * i));
}

function mean(byWeek: Map<string, number>, weeks: string[]): number {
  if (!weeks.length) return 0;
  return weeks.reduce((sum, w) => sum + (byWeek.get(w) ?? 0), 0) / weeks.length;
}

/** Sum units per week (tolerates several rows for the same week). */
export function toWeekMap(weeks: WeekPoint[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of weeks) m.set(p.weekStart, (m.get(p.weekStart) ?? 0) + p.units);
  return m;
}

/**
 * AVG4 / AVG12 over complete weeks before the run date, plus the same averages one week
 * earlier (for the two-week surge confirmation). Missing weeks count as 0 and are reported.
 */
export function computeStats(weeks: WeekPoint[], runDate: string, cfg: EngineConfig): SkuStats {
  const latest = latestCompleteWeekStart(runDate);
  const complete = weeks.filter((p) => p.weekStart <= latest);
  const byWeek = toWeekMap(complete);
  const seen = [...byWeek.keys()].sort();
  const first = seen[0] ?? null;

  const w12 = weekWindow(latest, cfg.avgLongWeeks);
  const prevLatest = addDays(latest, -7);
  const w12Prev = weekWindow(prevLatest, cfg.avgLongWeeks);

  // Only weeks after the SKU's first sale count as "missing" (earlier ones are just no history: E1).
  const missingWeeks = first ? w12.filter((w) => w >= first && !byWeek.has(w)).sort() : [];

  return {
    avg4: mean(byWeek, w12.slice(0, cfg.avgShortWeeks)),
    avg12: mean(byWeek, w12),
    avg4Prev: mean(byWeek, w12Prev.slice(0, cfg.avgShortWeeks)),
    avg12Prev: mean(byWeek, w12Prev),
    latestWeek: byWeek.has(latest) ? latest : null,
    latestUnits: byWeek.get(latest) ?? null,
    historyWeeks: seen.length,
    missingWeeks,
  };
}
