import { engineConfig, type EngineConfig } from "@/config/engine";
import { addDays, latestCompleteWeekStart, overlaps } from "./dates";
import { computeStats, toWeekMap, weekWindow } from "./stats";
import type {
  EventFlagInput,
  ExceptionHit,
  Flag,
  FestivalWindow,
  RunInput,
  RunResult,
  SkuInput,
  SkuResult,
  SkuStats,
} from "./types";

const WOC_CAP = 999; // stored instead of Infinity when demand is zero

export interface SkuContext {
  runDate: string;
  festivalFactor: number;
  eventFlags: EventFlagInput[];
  knownDistributors?: string[];
  cfg?: EngineConfig;
}

/** F = 1.25 if any festival window overlaps [runDate, runDate + lookahead]. */
export function festivalFactorFor(runDate: string, festivals: FestivalWindow[], cfg: EngineConfig = engineConfig) {
  const end = addDays(runDate, cfg.festivalLookaheadDays);
  const hit = festivals.find((f) => overlaps(runDate, end, f.startDate, f.endDate));
  return { factor: hit ? cfg.festivalFactor : 1, festival: hit ?? null };
}

/** Round to case pack: up for general SKUs, down for perishables. */
export function roundToPack(q: number, pack: number, perishable: boolean): number {
  if (q <= 0) return 0;
  const p = pack > 0 ? pack : 1;
  const packs = perishable ? Math.floor(q / p + 1e-9) : Math.ceil(q / p - 1e-9);
  return packs * p;
}

const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });

/**
 * Decide one SKU from precomputed stats. Pure: no I/O.
 * Decision order (first match wins): EXCEPTION, OVERSTOCK, STOCKOUT_RISK, HIGH_DEMAND, WATCH, OK.
 */
export function decideSku(sku: SkuInput, stats: SkuStats, ctx: SkuContext): SkuResult {
  const cfg = ctx.cfg ?? engineConfig;
  const F = ctx.festivalFactor;
  const win = sku.isPerishable ? cfg.cover.perishable : cfg.cover.general;
  const pack = sku.casePack ?? cfg.defaultCasePack;
  const warnings: string[] = [];

  // 1. Surge test on the latest week AND the week before.
  const D = stats.avg12 * F;
  const surgeLatest = stats.avg4 > cfg.surgeThreshold * D;
  const surgePrev = stats.avg4Prev > cfg.surgeThreshold * stats.avg12Prev * F;
  const surgeConfirmed = surgeLatest && surgePrev;
  const surgeLatestOnly = surgeLatest && !surgePrev;

  // 2–3. Demand rate and cover.
  const R = surgeConfirmed ? stats.avg4 : D;
  const onOrderAvailable = sku.onOrder !== null && sku.onOrder !== undefined;
  if (!onOrderAvailable) warnings.push("on-order unavailable");
  const IP = (sku.onHand ?? 0) + (sku.onOrder ?? 0);
  const WOC = R > 0 ? IP / R : IP > 0 ? WOC_CAP : 0;

  // Quantity.
  const useMaster = cfg.qStdSource === "master" && (sku.standardReorderQty ?? 0) > 0;
  const qStdRaw = useMaster ? sku.standardReorderQty! : cfg.qStdWeeks * stats.avg12;
  const qStd = Math.max(pack, Math.round(qStdRaw / pack) * pack);
  const s = surgeConfirmed ? cfg.surgeMultiplier : 1;
  const Q = roundToPack(Math.min(qStd * s, win.max * R - IP), pack, sku.isPerishable);

  // Rule table (exceptions applied below).
  let flag: Flag;
  let qty = 0;
  if (WOC > win.max) flag = "OVERSTOCK";
  else if (WOC < win.min) { flag = "STOCKOUT_RISK"; qty = Q; }
  else if (surgeConfirmed) { flag = "HIGH_DEMAND"; qty = Q; }
  else if (surgeLatestOnly) flag = "WATCH";
  else flag = "OK";

  const unitPrice = sku.unitPrice ?? null;
  const orderValue = unitPrice !== null ? qty * unitPrice : null;

  // Exceptions E1–E7.
  const ex: ExceptionHit[] = [];
  if (stats.historyWeeks < cfg.minHistoryWeeks)
    ex.push({ code: "E1", detail: `Only ${stats.historyWeeks} weeks of sales history (needs ${cfg.minHistoryWeeks}).` });

  const swing = distributorSwing(sku, ctx.runDate, cfg);
  if (swing) ex.push({ code: "E2", detail: swing });

  const flags = activeEventFlags(sku, ctx.runDate, ctx.eventFlags);
  if (flags.length)
    ex.push({ code: "E3", detail: `Active market event: ${flags.map((f) => f.note).join("; ")}.` });

  const data: string[] = [...(sku.dataIssues ?? [])];
  if (stats.missingWeeks.length) data.push(`missing sales weeks ${stats.missingWeeks.join(", ")}`);
  if (sku.onHand === null || sku.onHand === undefined) data.push("no inventory snapshot");
  else if (sku.onHand < 0) data.push(`negative stock (${sku.onHand})`);
  if (sku.onOrder !== null && sku.onOrder !== undefined && sku.onOrder < 0) data.push(`negative on-order (${sku.onOrder})`);
  if (ctx.knownDistributors) {
    const unknown = sku.distributors.map((d) => d.code).filter((c) => !ctx.knownDistributors!.includes(c));
    if (unknown.length) data.push(`unmatched distributor IDs ${unknown.join(", ")}`);
  }
  if (data.length) ex.push({ code: "E4", detail: `Data problem: ${data.join("; ")}.` });

  if (sku.leadTimeWeeks === null || sku.leadTimeWeeks === undefined) warnings.push("lead time unavailable: E5 skipped");
  else if (sku.leadTimeWeeks >= win.min)
    ex.push({ code: "E5", detail: `Lead time ${sku.leadTimeWeeks} weeks is at or above the ${win.min}-week minimum cover.` });

  if (unitPrice === null) warnings.push("unit price unavailable: E6 skipped");
  else if (orderValue !== null && orderValue > cfg.e6MaxOrderValue)
    ex.push({ code: "E6", detail: `Order value ₹${fmt(orderValue)} exceeds ₹${fmt(cfg.e6MaxOrderValue)}.` });

  if ((flag === "STOCKOUT_RISK" || flag === "HIGH_DEMAND") && R > 0 && (IP + qty) / R < win.min)
    ex.push({
      code: "E7",
      detail: `Capped order of ${fmt(qty)} still leaves ${fmt((IP + qty) / R, 2)} weeks of cover, below the ${win.min}-week minimum.`,
    });

  const suggestedQty = qty;
  if (ex.length) { flag = "EXCEPTION"; qty = 0; }

  const result: SkuResult = {
    skuCode: sku.code,
    flag,
    avg4: stats.avg4,
    avg12: stats.avg12,
    festivalFactor: F,
    demandRate: R,
    inventoryPosition: IP,
    weeksOfCover: Math.min(WOC, WOC_CAP),
    qStd,
    qty,
    suggestedQty,
    orderValue: unitPrice !== null ? qty * unitPrice : null,
    surgeConfirmed,
    surgeLatestOnly,
    onOrderAvailable,
    exceptions: ex,
    reason: "",
    warnings,
  };
  result.reason = reasonFor(result, win, suggestedQty);
  return result;
}

function reasonFor(r: SkuResult, win: { min: number; max: number }, suggested: number): string {
  const cover = `${fmt(r.weeksOfCover, 1)} weeks of cover at ${fmt(r.demandRate)} units/week${r.festivalFactor > 1 && !r.surgeConfirmed ? " (festival uplift applied)" : ""}`;
  const tail = r.onOrderAvailable ? "" : " (on-order unavailable)";
  switch (r.flag) {
    case "EXCEPTION":
      return `Needs Raghav's judgment — ${r.exceptions.map((e) => `${e.code}: ${e.detail}`).join(" ")} Engine figure for reference: ${fmt(suggested)} units.${tail}`;
    case "OVERSTOCK":
      return `Stock is ${cover}, above the ${win.max}-week maximum; pause the next order.${tail}`;
    case "STOCKOUT_RISK":
      return `Stock is ${cover}, below the ${win.min}-week minimum; reorder ${fmt(r.qty)} units now${r.surgeConfirmed ? " (1.5× for a confirmed surge)" : ""}.${tail}`;
    case "HIGH_DEMAND":
      return `Last 4 weeks averaged ${fmt(r.avg4)} units/week, above the surge threshold two weeks running; next order 1.5× standard: ${fmt(r.qty)} units.${tail}`;
    case "WATCH":
      return `Sales crossed the surge threshold this week only (${fmt(r.avg4)} vs ${fmt(r.avg12 * r.festivalFactor)} expected); no change, retest next run.${tail}`;
    default:
      return `Stock is ${cover}, inside the ${win.min}–${win.max} week window; no change.${tail}`;
  }
}

/** E2: a distributor with ≥10% of the SKU's 12-week volume whose AVG4 moved ≥50% vs its own AVG12. */
export function distributorSwing(sku: SkuInput, runDate: string, cfg: EngineConfig = engineConfig): string | null {
  const latest = latestCompleteWeekStart(runDate);
  const w12 = weekWindow(latest, cfg.avgLongWeeks);
  const w4 = w12.slice(0, cfg.avgShortWeeks);
  const series = sku.distributors.map((d) => {
    const m = toWeekMap(d.weeks);
    const vol12 = w12.reduce((s, w) => s + (m.get(w) ?? 0), 0);
    const vol4 = w4.reduce((s, w) => s + (m.get(w) ?? 0), 0);
    return { code: d.code, vol12, avg12: vol12 / w12.length, avg4: vol4 / w4.length };
  });
  const total = series.reduce((s, d) => s + d.vol12, 0);
  if (total <= 0) return null;
  const hits = series.filter(
    (d) => d.vol12 / total >= cfg.e2MinShare && d.avg12 > 0 && Math.abs(d.avg4 / d.avg12 - 1) >= cfg.e2MinSwing,
  );
  if (!hits.length) return null;
  return hits
    .map((d) => `Distributor ${d.code} (${Math.round((d.vol12 / total) * 100)}% of volume) moved ${d.avg4 >= d.avg12 ? "+" : ""}${Math.round((d.avg4 / d.avg12 - 1) * 100)}% (AVG4 ${fmt(d.avg4)} vs AVG12 ${fmt(d.avg12)}).`)
    .join(" ");
}

/** E3: flags active on the run date for this SKU or any distributor selling it. */
export function activeEventFlags(sku: SkuInput, runDate: string, flags: EventFlagInput[]): EventFlagInput[] {
  const dists = new Set(sku.distributors.map((d) => d.code));
  return flags.filter((f) => {
    if (!(f.startDate <= runDate && runDate <= f.endDate)) return false;
    if (f.skuCode) return f.skuCode === sku.code;
    return !!f.distributorCode && dists.has(f.distributorCode);
  });
}

export function evaluateSku(sku: SkuInput, ctx: SkuContext): SkuResult {
  return decideSku(sku, computeStats(sku.weeks, ctx.runDate, ctx.cfg ?? engineConfig), ctx);
}

const EMPTY_FLAGS = (): Record<Flag, number> => ({ STOCKOUT_RISK: 0, OVERSTOCK: 0, HIGH_DEMAND: 0, WATCH: 0, OK: 0, EXCEPTION: 0 });

/** Run the engine over every SKU and apply the automatic guardrail. */
export function runEngine(input: RunInput, cfg: EngineConfig = engineConfig): RunResult {
  const { factor, festival } = festivalFactorFor(input.runDate, input.festivals, cfg);
  const ctx: SkuContext = { runDate: input.runDate, festivalFactor: factor, eventFlags: input.eventFlags, knownDistributors: input.knownDistributors, cfg };
  const results = input.skus.map((s) => evaluateSku(s, ctx));

  const byFlag = EMPTY_FLAGS();
  for (const r of results) byFlag[r.flag]++;

  // Guardrail compares ₹ when every SKU has a price, else units.
  const priced = input.skus.length > 0 && input.skus.every((s) => s.unitPrice !== null && s.unitPrice !== undefined);
  const priceOf = new Map(input.skus.map((s) => [s.code, s.unitPrice ?? 0]));
  const recommendedQty = results.reduce((s, r) => s + r.qty, 0);
  const baselineQty = results.reduce((s, r) => s + r.qStd, 0);
  const recommendedValue = priced ? results.reduce((s, r) => s + r.qty * priceOf.get(r.skuCode)!, 0) : null;
  const baselineValue = priced ? results.reduce((s, r) => s + r.qStd * priceOf.get(r.skuCode)!, 0) : null;
  const basis = priced ? "value" : "units";
  const rec = priced ? recommendedValue! : recommendedQty;
  const base = priced ? baselineValue! : baselineQty;
  const ratio = base > 0 ? rec / base : 0;

  const warnings: string[] = [];
  if (festival) warnings.push(`Festival uplift ×${factor} applied (${festival.name} within ${cfg.festivalLookaheadDays} days).`);
  const counts = new Map<string, number>();
  for (const r of results) for (const w of r.warnings) counts.set(w, (counts.get(w) ?? 0) + 1);
  for (const [w, n] of counts) warnings.push(`${w} (${n} of ${results.length} SKUs).`);
  if (!priced) warnings.push("Guardrail compared in units because unit prices are missing.");

  const totals = {
    skus: results.length,
    byFlag,
    exceptionRate: results.length ? byFlag.EXCEPTION / results.length : 0,
    recommendedQty,
    baselineQty,
    recommendedValue,
    baselineValue,
    guardrailBasis: basis as "value" | "units",
    guardrailRatio: ratio,
  };

  if (ratio > cfg.guardrailMultiple) {
    const unit = priced ? "₹" : "units";
    return {
      runDate: input.runDate,
      status: "HALTED",
      haltReason: `Guardrail: total recommended ${fmt(rec)} ${unit} is ${fmt(ratio, 2)}× the all-SKUs-at-Q_std baseline of ${fmt(base)} ${unit} (limit ${cfg.guardrailMultiple}×). Switch to manual planning.`,
      festivalFactor: factor,
      results: [],
      totals,
      warnings,
    };
  }
  return { runDate: input.runDate, status: "COMPLETED", haltReason: null, festivalFactor: factor, results, totals, warnings };
}
