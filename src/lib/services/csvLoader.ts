/**
 * Reads the five case CSVs from DATA_DIR and normalises them per src/config/columnMap.ts.
 * Pure parsing + validation; no database access. Used by scripts/ingest.ts and scripts/dry-run.ts.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { isoDate, isoWeekToMonday, readCsv, toWeekStart, type CsvRow } from "@/lib/csv";

export interface SkuRec {
  code: string; name: string; category: string; isPerishable: boolean;
  standardReorderQty: number | null; unitOfMeasure: string | null; primaryDistributorCode: string | null;
  unitPrice: number | null; casePack: number | null; leadTimeWeeks: number | null;
}
export interface DistributorRec { code: string; name: string; region: string; status: string | null }
export interface SaleRec { skuCode: string; distributorCode: string; weekStart: string; units: number }
export interface InventoryRec { skuCode: string; asOfDate: string; location: string | null; onHand: number; onOrder: number | null }
export interface FestivalRec { name: string; startDate: string; endDate: string; region: string | null }
export interface Reject { file: string; line: number; reason: string; row: CsvRow }

export interface LoadedData {
  skus: SkuRec[];
  distributors: DistributorRec[];
  sales: SaleRec[];
  inventory: InventoryRec[];
  festivals: FestivalRec[];
  rejects: Reject[];
  notes: string[];
  rawCounts: Record<string, number>;
}

const FILES = {
  sku: "sku_master.csv",
  distributor: "distributor_master.csv",
  sales: "weekly_sales.csv",
  inventory: "current_inventory.csv",
  calendar: "calendar.csv",
};

const int = (v: string | undefined) => (v !== undefined && /^-?\d+$/.test(v.trim()) ? Number(v) : null);
const num = (v: string | undefined) => (v !== undefined && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
const str = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

const FOOTPRINT = ["Maharashtra", "Goa"];

export function loadCaseData(dataDir: string): LoadedData {
  const rejects: Reject[] = [];
  const notes: string[] = [];
  const rawCounts: Record<string, number> = {};
  const read = (f: string) => {
    const p = path.join(dataDir, f);
    if (!existsSync(p)) throw new Error(`Missing CSV: ${p}`);
    const t = readCsv(p);
    rawCounts[f] = t.rows.length;
    return t.rows;
  };
  const reject = (file: string, i: number, reason: string, row: CsvRow) => rejects.push({ file, line: i + 2, reason, row });

  // Distributors
  const distributors: DistributorRec[] = [];
  const distSeen = new Set<string>();
  read(FILES.distributor).forEach((r, i) => {
    const code = str(r.Distributor_ID);
    if (!code || !str(r.Distributor_Name)) return reject(FILES.distributor, i, "missing ID or name", r);
    if (distSeen.has(code)) return reject(FILES.distributor, i, `duplicate distributor ${code}`, r);
    distSeen.add(code);
    distributors.push({ code, name: r.Distributor_Name!, region: str(r.Region) ?? "Unknown", status: str(r.Status) });
  });
  const outside = distributors.filter((d) => !FOOTPRINT.includes(d.region));
  if (outside.length)
    notes.push(`Distributors outside the stated Maharashtra/Goa footprint (kept): ${outside.map((d) => `${d.code} ${d.region}`).join(", ")}.`);
  if (!distributors.some((d) => d.region === "Goa")) notes.push("No Goa distributor in the sample.");

  // SKUs
  const skus: SkuRec[] = [];
  const skuSeen = new Set<string>();
  read(FILES.sku).forEach((r, i) => {
    const code = str(r.SKU_ID);
    if (!code || !str(r.SKU_Name)) return reject(FILES.sku, i, "missing ID or name", r);
    if (skuSeen.has(code)) return reject(FILES.sku, i, `duplicate SKU ${code}`, r);
    const per = str(r.Perishability)?.toLowerCase();
    if (per !== "high" && per !== "low") return reject(FILES.sku, i, `unknown Perishability '${r.Perishability}'`, r);
    const dist = str(r.Distributor_ID);
    if (dist && !distSeen.has(dist)) return reject(FILES.sku, i, `unknown distributor ${dist}`, r);
    skuSeen.add(code);
    skus.push({
      code, name: r.SKU_Name!, category: str(r.Category) ?? "Uncategorised", isPerishable: per === "high",
      standardReorderQty: int(r.Standard_Reorder_Qty), unitOfMeasure: str(r.Unit_of_Measure), primaryDistributorCode: dist,
      unitPrice: num(r.Unit_Price), casePack: int(r.Case_Pack), leadTimeWeeks: num(r.Lead_Time_Weeks),
    });
  });
  const skuDist = new Map(skus.map((s) => [s.code, s.primaryDistributorCode]));

  // Weekly sales (distributor derived from sku_master — confirmed mapping)
  const sales: SaleRec[] = [];
  const saleKey = new Set<string>();
  read(FILES.sales).forEach((r, i) => {
    const skuCode = str(r.SKU_ID);
    if (!skuCode || !skuSeen.has(skuCode)) return reject(FILES.sales, i, `unknown SKU ${r.SKU_ID}`, r);
    const raw = str(r.Week) ?? "";
    const monday = isoWeekToMonday(raw) ?? (/^\d{4}-\d{2}-\d{2}$/.test(raw) ? toWeekStart(new Date(`${raw}T00:00:00Z`)) : null);
    if (!monday) return reject(FILES.sales, i, `unparseable week '${raw}'`, r);
    const units = int(r.Units_Sold);
    if (units === null) return reject(FILES.sales, i, `non-integer units '${r.Units_Sold}'`, r);
    if (units < 0) return reject(FILES.sales, i, `negative units ${units}`, r);
    const distributorCode = str(r.Distributor_ID) ?? skuDist.get(skuCode);
    if (!distributorCode) return reject(FILES.sales, i, `no distributor for SKU ${skuCode}`, r);
    const weekStart = isoDate(monday);
    const key = `${skuCode}|${distributorCode}|${weekStart}`;
    if (saleKey.has(key)) return reject(FILES.sales, i, `duplicate sale ${key}`, r);
    saleKey.add(key);
    sales.push({ skuCode, distributorCode, weekStart, units });
  });

  // Inventory
  const inventory: InventoryRec[] = [];
  const invKey = new Set<string>();
  read(FILES.inventory).forEach((r, i) => {
    const skuCode = str(r.SKU_ID);
    if (!skuCode || !skuSeen.has(skuCode)) return reject(FILES.inventory, i, `unknown SKU ${r.SKU_ID}`, r);
    const onHand = int(r.Units_On_Hand);
    if (onHand === null) return reject(FILES.inventory, i, `non-integer on-hand '${r.Units_On_Hand}'`, r);
    const asOf = str(r.As_Of_Date);
    if (!asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return reject(FILES.inventory, i, `bad As_Of_Date '${r.As_Of_Date}'`, r);
    const key = `${skuCode}|${asOf}`;
    if (invKey.has(key)) return reject(FILES.inventory, i, `duplicate snapshot ${key}`, r);
    invKey.add(key);
    // Negative stock is kept so the engine can raise E4 on it.
    inventory.push({ skuCode, asOfDate: asOf, location: str(r.Location), onHand, onOrder: int(r.Units_On_Order) });
  });

  // Calendar → one festival window per flagged month
  const festivals: FestivalRec[] = [];
  read(FILES.calendar).forEach((r, i) => {
    if (!/^true$/i.test(r.Is_Festival_Month ?? "")) return;
    const y = int(r.Year), m = int(r.Month);
    if (!y || !m || m < 1 || m > 12) return reject(FILES.calendar, i, "bad Year/Month", r);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));
    festivals.push({ name: `Festival month ${y}-${String(m).padStart(2, "0")}`, startDate: isoDate(start), endDate: isoDate(end), region: null });
  });

  return { skus, distributors, sales, inventory, festivals, rejects, notes, rawCounts };
}

/** Fields the engine can use but the CSVs don't provide. */
export function missingFields(d: LoadedData): string[] {
  const out: string[] = [];
  const none = <T>(xs: T[], f: (x: T) => unknown) => xs.length > 0 && xs.every((x) => f(x) === null || f(x) === undefined);
  if (none(d.skus, (s) => s.unitPrice)) out.push("Sku.unitPrice — order value and E6 skipped; guardrail runs in units");
  if (none(d.skus, (s) => s.casePack)) out.push("Sku.casePack — defaults to 1");
  if (none(d.skus, (s) => s.leadTimeWeeks)) out.push("Sku.leadTimeWeeks — E5 skipped");
  if (none(d.inventory, (s) => s.onOrder)) out.push("InventorySnapshot.onOrder — treated as 0, labelled 'on-order unavailable'");
  out.push("WeeklySale.distributor — not in sales file; derived from sku_master.Distributor_ID");
  out.push("Festival names/dates — calendar has month flags only");
  out.push("Distributor.tier — not provided");
  return out;
}
