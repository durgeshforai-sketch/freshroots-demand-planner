import type { EventFlagInput, RunInput, SkuInput } from "@/lib/engine";
import type { DistributorRec, FestivalRec, InventoryRec, SaleRec, SkuRec } from "./csvLoader";

export interface PlanningData {
  skus: SkuRec[];
  distributors: DistributorRec[];
  sales: SaleRec[];
  inventory: InventoryRec[];
  festivals: FestivalRec[];
  eventFlags: EventFlagInput[];
}

/** Shape DB or CSV records into the engine's input for one run date. Pure. */
export function buildRunInput(d: PlanningData, runDate: string): RunInput {
  const salesBySku = new Map<string, SaleRec[]>();
  for (const s of d.sales) salesBySku.set(s.skuCode, [...(salesBySku.get(s.skuCode) ?? []), s]);

  // Latest snapshot on or before the run date.
  const invBySku = new Map<string, InventoryRec>();
  for (const i of d.inventory) {
    if (i.asOfDate > runDate) continue;
    const cur = invBySku.get(i.skuCode);
    if (!cur || i.asOfDate > cur.asOfDate) invBySku.set(i.skuCode, i);
  }

  const skus: SkuInput[] = d.skus.map((s) => {
    const rows = salesBySku.get(s.code) ?? [];
    const total = new Map<string, number>();
    const byDist = new Map<string, Map<string, number>>();
    for (const r of rows) {
      total.set(r.weekStart, (total.get(r.weekStart) ?? 0) + r.units);
      const m = byDist.get(r.distributorCode) ?? new Map<string, number>();
      m.set(r.weekStart, (m.get(r.weekStart) ?? 0) + r.units);
      byDist.set(r.distributorCode, m);
    }
    const inv = invBySku.get(s.code);
    return {
      code: s.code,
      name: s.name,
      isPerishable: s.isPerishable,
      standardReorderQty: s.standardReorderQty,
      unitPrice: s.unitPrice,
      casePack: s.casePack,
      leadTimeWeeks: s.leadTimeWeeks,
      weeks: [...total].map(([weekStart, units]) => ({ weekStart, units })),
      distributors: [...byDist].map(([code, m]) => ({ code, weeks: [...m].map(([weekStart, units]) => ({ weekStart, units })) })),
      onHand: inv ? inv.onHand : null,
      onOrder: inv ? inv.onOrder : null,
    };
  });

  return {
    runDate,
    skus,
    festivals: d.festivals.map((f) => ({ name: f.name, startDate: f.startDate, endDate: f.endDate })),
    eventFlags: d.eventFlags,
    knownDistributors: d.distributors.map((x) => x.code),
  };
}
