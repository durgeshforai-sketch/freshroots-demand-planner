/**
 * Step 0 — inspect the case CSVs before modelling.
 * Usage: npm run data:inspect   (reads DATA_DIR from .env.local)
 */
import { config } from "dotenv";
import { readdirSync } from "node:fs";
import path from "node:path";
import { readCsv, isoWeekToMonday, isoDate, type CsvRow } from "../src/lib/csv";

config({ path: ".env.local" });
config();

const DATA_DIR = process.env.DATA_DIR;
if (!DATA_DIR) {
  console.error("DATA_DIR is not set. Add it to .env.local (quote the path; it contains spaces).");
  process.exit(1);
}

type ColType = "integer" | "number" | "boolean" | "date" | "iso-week" | "year-month" | "string" | "empty";

function inferType(values: string[]): ColType {
  const v = values.filter((x) => x !== "");
  if (v.length === 0) return "empty";
  const all = (re: RegExp) => v.every((x) => re.test(x));
  if (all(/^-?\d+$/)) return "integer";
  if (all(/^-?\d+(\.\d+)?$/)) return "number";
  if (all(/^(true|false)$/i)) return "boolean";
  if (all(/^\d{4}-\d{2}-\d{2}$/)) return "date";
  if (all(/^\d{4}-W\d{2}$/)) return "iso-week";
  if (all(/^\d{4}-\d{2}$/)) return "year-month";
  return "string";
}

function range(values: string[], type: ColType): string | null {
  const v = values.filter((x) => x !== "").sort();
  if (!v.length) return null;
  if (type === "date" || type === "iso-week" || type === "year-month") return `${v[0]} → ${v[v.length - 1]}`;
  if (type === "integer" || type === "number") {
    const n = v.map(Number);
    return `${Math.min(...n)} → ${Math.max(...n)}`;
  }
  return null;
}

const files = readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".csv")).sort();
const tables: Record<string, { headers: string[]; rows: CsvRow[] }> = {};

console.log(`DATA_DIR: ${DATA_DIR}\nCSV files: ${files.length}\n`);

for (const f of files) {
  const t = readCsv(path.join(DATA_DIR, f));
  tables[f] = t;
  console.log("=".repeat(80));
  console.log(`${f} — ${t.rows.length} rows, ${t.headers.length} columns`);
  console.log("-".repeat(80));
  for (const h of t.headers) {
    const vals = t.rows.map((r) => r[h]);
    const type = inferType(vals);
    const distinct = new Set(vals).size;
    const blanks = vals.filter((x) => x === "").length;
    const r = range(vals, type);
    console.log(`  ${h.padEnd(22)} ${type.padEnd(11)} distinct=${String(distinct).padEnd(4)} blanks=${blanks}${r ? `  range: ${r}` : ""}`);
  }
  console.log("  first 5 rows:");
  for (const row of t.rows.slice(0, 5)) console.log("   ", JSON.stringify(row));
  console.log();
}

// ---- Cross-file checks -------------------------------------------------------
const get = (name: string) => tables[files.find((f) => f.startsWith(name)) ?? ""];
const sku = get("sku_master");
const dist = get("distributor_master");
const inv = get("current_inventory");
const sales = get("weekly_sales");
const cal = get("calendar");

console.log("=".repeat(80));
console.log("CROSS-FILE SUMMARY");
console.log("-".repeat(80));
const skuIds = new Set(sku?.rows.map((r) => r.SKU_ID));
const distIds = new Set(dist?.rows.map((r) => r.Distributor_ID));
const salesSkus = new Set(sales?.rows.map((r) => r.SKU_ID));
const salesWeeks = [...new Set(sales?.rows.map((r) => r.Week))].sort();
console.log(`Distinct SKUs: master=${skuIds.size} sales=${salesSkus.size} inventory=${new Set(inv?.rows.map((r) => r.SKU_ID)).size}`);
console.log(`Distinct distributors: master=${distIds.size}; referenced by sku_master=${new Set(sku?.rows.map((r) => r.Distributor_ID)).size}`);
console.log(`Distinct sales weeks: ${salesWeeks.length} (${salesWeeks[0]} → ${salesWeeks.at(-1)})`);
if (salesWeeks.length) {
  const first = isoWeekToMonday(salesWeeks[0]!)!;
  const last = isoWeekToMonday(salesWeeks.at(-1)!)!;
  const end = new Date(last); end.setUTCDate(end.getUTCDate() + 6);
  console.log(`Sales week-start Mondays: ${isoDate(first)} → ${isoDate(last)} (last week ends ${isoDate(end)})`);
}

console.log("\nWeeks of history per SKU (and gaps / duplicates):");
const bySku = new Map<string, string[]>();
for (const r of sales?.rows ?? []) bySku.set(r.SKU_ID, [...(bySku.get(r.SKU_ID) ?? []), r.Week]);
for (const [s, weeks] of [...bySku].sort()) {
  const uniq = new Set(weeks);
  const missing = salesWeeks.filter((w) => !uniq.has(w));
  const dupes = weeks.length - uniq.size;
  console.log(`  ${s}: ${uniq.size} weeks${missing.length ? `, missing ${missing.join(",")}` : ""}${dupes ? `, ${dupes} duplicates` : ""}`);
}

const problems: string[] = [];
for (const s of salesSkus) if (!skuIds.has(s)) problems.push(`sales SKU ${s} not in sku_master`);
for (const r of inv?.rows ?? []) if (!skuIds.has(r.SKU_ID)) problems.push(`inventory SKU ${r.SKU_ID} not in sku_master`);
for (const s of skuIds) if (!salesSkus.has(s)) problems.push(`SKU ${s} has no sales`);
for (const r of sku?.rows ?? []) if (!distIds.has(r.Distributor_ID)) problems.push(`SKU ${r.SKU_ID} → unknown distributor ${r.Distributor_ID}`);
for (const r of sales?.rows ?? []) if (Number(r.Units_Sold) < 0) problems.push(`negative sales ${r.SKU_ID} ${r.Week}`);
for (const r of inv?.rows ?? []) if (Number(r.Units_On_Hand) < 0) problems.push(`negative stock ${r.SKU_ID}`);
console.log(`\nID / value problems: ${problems.length ? "\n  " + problems.join("\n  ") : "none"}`);

console.log("\nRegions in distributor_master:", [...new Set(dist?.rows.map((r) => r.Region))].join(", "));
console.log("Festival months in calendar:", cal?.rows.filter((r) => /true/i.test(r.Is_Festival_Month)).map((r) => r.Year_Month).join(", "));
console.log("Perishability values:", [...new Set(sku?.rows.map((r) => r.Perishability))].join(", "));

const wanted: Record<string, string[]> = {
  "sku_master": ["unit price", "case pack", "lead time"],
  "current_inventory": ["on-order quantity"],
  "weekly_sales": ["distributor ID (sales are SKU × week only)"],
  "calendar": ["festival names", "festival dates (month-level flag only)"],
  "distributor_master": ["tier"],
};
console.log("\nMISSING FIELDS vs spec:");
for (const [f, m] of Object.entries(wanted)) console.log(`  ${f}: ${m.join("; ")}`);
