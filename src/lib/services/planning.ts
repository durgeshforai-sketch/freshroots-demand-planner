/**
 * Service layer: load from DB → run the pure engine → persist. All writes for a run are one transaction.
 */
import { engineConfig } from "@/config/engine";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, conflict, notFound } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  addDays,
  computeKillMetrics,
  computeStats,
  fmtDay,
  latestCompleteWeekStart,
  preplacementCheck,
  runEngine,
  type Flag,
} from "@/lib/engine";
import { toWeekMap, weekWindow } from "@/lib/engine/stats";
import { buildRunInput, type PlanningData } from "./runInput";

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => fmtDay(d);
const toNum = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

export async function loadPlanningData(): Promise<PlanningData> {
  const [skus, distributors, sales, inventory, festivals, flags] = await Promise.all([
    prisma.sku.findMany({ orderBy: { code: "asc" } }),
    prisma.distributor.findMany(),
    prisma.weeklySale.findMany(),
    prisma.inventorySnapshot.findMany(),
    prisma.festival.findMany(),
    prisma.eventFlag.findMany(),
  ]);
  return {
    skus: skus.map((s) => ({ ...s, unitPrice: toNum(s.unitPrice) })),
    distributors,
    sales: sales.map((s) => ({ skuCode: s.skuCode, distributorCode: s.distributorCode, weekStart: iso(s.weekStart), units: s.units })),
    inventory: inventory.map((i) => ({ skuCode: i.skuCode, asOfDate: iso(i.asOfDate), location: i.location, onHand: i.onHand, onOrder: i.onOrder })),
    festivals: festivals.map((f) => ({ name: f.name, startDate: iso(f.startDate), endDate: iso(f.endDate), region: f.region })),
    eventFlags: flags.map((f) => ({ id: f.id, skuCode: f.skuCode, distributorCode: f.distributorCode, startDate: iso(f.startDate), endDate: iso(f.endDate), note: f.note })),
  };
}

/** Default run date: the latest inventory snapshot date (Monday after the last complete week). */
export async function defaultRunDate(): Promise<string> {
  const latest = await prisma.inventorySnapshot.findFirst({ orderBy: { asOfDate: "desc" } });
  return latest ? iso(latest.asOfDate) : fmtDay(new Date());
}

export async function createRun(runDate?: string) {
  const date = runDate ?? (await defaultRunDate());
  const data = await loadPlanningData();
  if (!data.skus.length) throw conflict("No SKU data loaded. Run `npm run data:ingest` first.");
  const result = runEngine(buildRunInput(data, date), engineConfig);

  const run = await prisma.$transaction(async (tx) => {
    const run = await tx.run.create({
      data: {
        runDate: day(date),
        status: result.status,
        haltReason: result.haltReason,
        configSnapshot: engineConfig as unknown as Prisma.InputJsonValue,
        totals: { ...result.totals, festivalFactor: result.festivalFactor } as unknown as Prisma.InputJsonValue,
        warnings: result.warnings,
      },
    });
    // Guardrail: a HALTED run saves no recommendations.
    if (result.status === "COMPLETED" && result.results.length) {
      await tx.recommendation.createMany({
        data: result.results.map((r) => ({
          runId: run.id,
          skuCode: r.skuCode,
          flag: r.flag,
          avg4: r.avg4,
          avg12: r.avg12,
          festivalFactor: r.festivalFactor,
          demandRate: r.demandRate,
          inventoryPosition: r.inventoryPosition,
          weeksOfCover: r.weeksOfCover,
          qty: r.qty,
          orderValue: r.orderValue,
          reason: r.reason,
          onOrderAvailable: r.onOrderAvailable,
          surgeConfirmed: r.surgeConfirmed,
        })),
      });
      const ex = result.results.flatMap((r) => r.exceptions.map((e) => ({ runId: run.id, skuCode: r.skuCode, code: e.code, detail: e.detail })));
      if (ex.length) await tx.recException.createMany({ data: ex });
    }
    return run;
  });

  if (result.status === "HALTED") logger.warn("run.halted", { runId: run.id, runDate: date, reason: result.haltReason });
  else logger.info("run.completed", { runId: run.id, runDate: date, byFlag: result.totals.byFlag, exceptionRate: result.totals.exceptionRate });
  return getRun(run.id);
}

export async function listRuns(limit = 50) {
  return prisma.run.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: { id: true, runDate: true, status: true, haltReason: true, totals: true, createdAt: true },
  });
}

export async function getRun(id: number) {
  const run = await prisma.run.findUnique({
    where: { id },
    include: {
      recommendations: { orderBy: { skuCode: "asc" }, include: { sku: { select: { name: true, isPerishable: true, category: true } } } },
      exceptions: { orderBy: [{ code: "asc" }, { skuCode: "asc" }] },
    },
  });
  if (!run) throw notFound(`Run ${id}`);
  return run;
}

export async function latestRun() {
  const r = await prisma.run.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } });
  return r ? getRun(r.id) : null;
}

export interface RecFilters {
  runId?: number;
  flag?: Flag;
  status?: "PENDING" | "APPROVED" | "OVERRIDDEN" | "REJECTED";
  perishable?: boolean;
}

export async function listRecommendations(f: RecFilters) {
  const runId = f.runId ?? (await prisma.run.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }))?.id;
  if (!runId) return [];
  return prisma.recommendation.findMany({
    where: {
      runId,
      ...(f.flag ? { flag: f.flag } : {}),
      ...(f.status ? { status: f.status } : {}),
      ...(f.perishable !== undefined ? { sku: { isPerishable: f.perishable } } : {}),
    },
    orderBy: { skuCode: "asc" },
    include: {
      sku: { select: { name: true, isPerishable: true, category: true } },
      decisions: { orderBy: { decidedAt: "desc" } },
      preplacementChecks: { orderBy: { checkedAt: "desc" } },
    },
  });
}

export interface DecisionInput {
  action: "APPROVE" | "OVERRIDE" | "REJECT";
  newQty?: number;
  reasonCode: string;
  note?: string;
  decidedBy: string;
}

/** Record Raghav's decision. The engine never places orders; this is the human step. */
export async function decide(recId: number, input: DecisionInput) {
  const rec = await prisma.recommendation.findUnique({ where: { id: recId } });
  if (!rec) throw notFound(`Recommendation ${recId}`);
  if (rec.status !== "PENDING") throw conflict(`Recommendation ${recId} is already ${rec.status}`);
  if (input.action === "OVERRIDE" && (input.newQty === undefined || input.newQty < 0))
    throw badRequest("OVERRIDE requires newQty ≥ 0");
  if (input.action === "APPROVE" && rec.flag === "EXCEPTION")
    throw conflict("Exceptions have no automatic quantity: OVERRIDE with a quantity or REJECT");
  if (input.action === "OVERRIDE" && input.reasonCode === "AGREE")
    throw badRequest("Use APPROVE when you agree with the engine");

  const status = input.action === "APPROVE" ? "APPROVED" : input.action === "OVERRIDE" ? "OVERRIDDEN" : "REJECTED";
  const [decision] = await prisma.$transaction([
    prisma.decision.create({
      data: { recommendationId: recId, action: input.action, newQty: input.newQty, reasonCode: input.reasonCode, note: input.note, decidedBy: input.decidedBy },
    }),
    prisma.recommendation.update({ where: { id: recId }, data: { status } }),
  ]);
  logger.info("decision.recorded", { recommendationId: recId, skuCode: rec.skuCode, flag: rec.flag, action: input.action, newQty: input.newQty, reasonCode: input.reasonCode, decidedBy: input.decidedBy });
  return { decision, status };
}

export interface PreplacementInputBody {
  owner?: string;
  ownerDecision?: "PROCEED" | "REDUCE" | "CANCEL";
  ownerNote?: string;
}

/**
 * Before procurement places an approved order: re-check the market since approval.
 * With `ownerDecision`, records the named owner's call on the latest HOLD instead.
 */
export async function runPreplacementCheck(recId: number, body: PreplacementInputBody) {
  const rec = await prisma.recommendation.findUnique({
    where: { id: recId },
    include: { run: true, decisions: { orderBy: { decidedAt: "desc" }, take: 1 }, preplacementChecks: { orderBy: { checkedAt: "desc" }, take: 1 } },
  });
  if (!rec) throw notFound(`Recommendation ${recId}`);
  if (rec.status !== "APPROVED" && rec.status !== "OVERRIDDEN") throw conflict("Only approved or overridden recommendations can be checked before placement");

  if (body.ownerDecision) {
    const last = rec.preplacementChecks[0];
    if (!last || last.result !== "HOLD") throw conflict("No HOLD to decide on; run the check first");
    if (!body.owner) throw badRequest("A named owner is required to decide on a HOLD");
    const updated = await prisma.preplacementCheck.update({
      where: { id: last.id },
      data: { ownerDecision: `${body.ownerDecision} by ${body.owner}`, ownerNote: body.ownerNote },
    });
    logger.info("preplacement.owner_decision", { recommendationId: recId, decision: body.ownerDecision, owner: body.owner });
    return updated;
  }

  const approvedAt = rec.decisions[0]?.decidedAt ?? rec.createdAt;
  const runWeek = latestCompleteWeekStart(iso(rec.run.runDate));
  const sales = await prisma.weeklySale.findMany({ where: { skuCode: rec.skuCode } });
  const newer = sales.filter((s) => iso(s.weekStart) > runWeek).map((s) => iso(s.weekStart)).sort();
  const latestNew = newer.at(-1) ?? null;
  const latestWeekUnits = latestNew ? sales.filter((s) => iso(s.weekStart) === latestNew).reduce((a, s) => a + s.units, 0) : null;

  // Top distributors by 12-week volume at run time; their AVG4 then vs their units in the newest week.
  const byDist = new Map<string, { weekStart: string; units: number }[]>();
  for (const s of sales) byDist.set(s.distributorCode, [...(byDist.get(s.distributorCode) ?? []), { weekStart: iso(s.weekStart), units: s.units }]);
  const w12 = weekWindow(runWeek, engineConfig.avgLongWeeks);
  const distributors = [...byDist].map(([code, weeks]) => {
    const m = toWeekMap(weeks);
    const st = computeStats(weeks, iso(rec.run.runDate), engineConfig);
    return { code, vol12: w12.reduce((a, w) => a + (m.get(w) ?? 0), 0), baselineAvg4: st.avg4, latestUnits: latestNew ? m.get(latestNew) ?? 0 : st.avg4 };
  });
  distributors.sort((a, b) => b.vol12 - a.vol12);

  const distCodes = distributors.map((d) => d.code);
  const newFlags = await prisma.eventFlag.findMany({
    where: {
      createdAt: { gt: approvedAt },
      endDate: { gte: day(iso(new Date())) },
      OR: [{ skuCode: rec.skuCode }, { skuCode: null, distributorCode: { in: distCodes } }],
    },
  });

  const out = preplacementCheck({
    avg4AtRecommendation: rec.avg4,
    latestWeekUnits,
    distributors: latestNew ? distributors.slice(0, engineConfig.preplacement.topDistributors) : [],
    newEventFlags: newFlags.map((f) => ({ note: f.note })),
  });
  if (!latestNew) out.triggers.unshift("No new sales week since the run; check based on event flags only.");

  const check = await prisma.preplacementCheck.create({
    data: { recommendationId: recId, result: out.result, triggers: out.triggers },
  });
  logger.info("preplacement.checked", { recommendationId: recId, skuCode: rec.skuCode, result: out.result, triggers: out.triggers.length });
  return check;
}

export async function listExceptions(runId?: number) {
  const id = runId ?? (await prisma.run.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }))?.id;
  if (!id) return { runId: null, byCode: {} as Record<string, number>, items: [] };
  const items = await prisma.recException.findMany({
    where: { runId: id },
    orderBy: [{ code: "asc" }, { skuCode: "asc" }],
    include: { sku: { select: { name: true, isPerishable: true } } },
  });
  const byCode: Record<string, number> = {};
  for (const e of items) byCode[e.code] = (byCode[e.code] ?? 0) + 1;
  return { runId: id, byCode, items };
}

export interface FlagInput {
  skuCode?: string;
  distributorCode?: string;
  startDate: string;
  endDate: string;
  note: string;
  createdBy: string;
}

export async function createFlag(f: FlagInput) {
  if (!f.skuCode && !f.distributorCode) throw badRequest("A flag needs skuCode or distributorCode");
  if (f.endDate < f.startDate) throw badRequest("endDate is before startDate");
  if (f.skuCode && !(await prisma.sku.findUnique({ where: { code: f.skuCode } }))) throw notFound(`SKU ${f.skuCode}`);
  if (f.distributorCode && !(await prisma.distributor.findUnique({ where: { code: f.distributorCode } }))) throw notFound(`Distributor ${f.distributorCode}`);
  const flag = await prisma.eventFlag.create({
    data: { ...f, startDate: day(f.startDate), endDate: day(f.endDate) },
  });
  logger.info("flag.created", { id: flag.id, skuCode: f.skuCode, distributorCode: f.distributorCode, createdBy: f.createdBy });
  return flag;
}

export async function getMetrics() {
  const [decisions, latest] = await Promise.all([
    prisma.decision.groupBy({ by: ["action"], _count: { _all: true } }),
    prisma.run.findFirst({ where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, select: { id: true, runDate: true } }),
  ]);
  const count = (a: string) => decisions.find((d) => d.action === a)?._count._all ?? 0;
  const [recs, exc, halted, runs] = await Promise.all([
    latest ? prisma.recommendation.count({ where: { runId: latest.id } }) : 0,
    latest ? prisma.recommendation.count({ where: { runId: latest.id, flag: "EXCEPTION" } }) : 0,
    prisma.run.count({ where: { status: "HALTED" } }),
    prisma.run.count(),
  ]);
  const km = computeKillMetrics({ decisions: { approve: count("APPROVE"), override: count("OVERRIDE"), reject: count("REJECT") }, recommendations: recs, exceptions: exc });
  return {
    ...km,
    decisions: { approve: count("APPROVE"), override: count("OVERRIDE"), reject: count("REJECT") },
    latestRun: latest ? { id: latest.id, runDate: iso(latest.runDate), recommendations: recs, exceptions: exc } : null,
    runs: { total: runs, halted },
  };
}

export async function skuDetail(code: string) {
  const sku = await prisma.sku.findUnique({
    where: { code },
    include: {
      primaryDistributor: true,
      sales: { orderBy: { weekStart: "asc" } },
      inventory: { orderBy: { asOfDate: "desc" } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 20, include: { run: { select: { runDate: true, status: true } } } },
    },
  });
  if (!sku) throw notFound(`SKU ${code}`);

  // Weekly totals and rolling averages / cover for the chart.
  const totals = new Map<string, number>();
  for (const s of sku.sales) totals.set(iso(s.weekStart), (totals.get(iso(s.weekStart)) ?? 0) + s.units);
  const weeks = [...totals].map(([weekStart, units]) => ({ weekStart, units })).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const series = weeks.map((w) => {
    const st = computeStats(weeks, addDays(w.weekStart, 7), engineConfig);
    return { weekStart: w.weekStart, units: w.units, avg4: st.avg4, avg12: st.historyWeeks >= engineConfig.avgLongWeeks ? st.avg12 : null };
  });
  return { ...sku, unitPrice: toNum(sku.unitPrice), series };
}

export async function health() {
  const t = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, db: "up", ms: Date.now() - t };
}
