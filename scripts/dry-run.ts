/**
 * Run the engine straight from the CSVs (no database). Useful for checking rule changes.
 * Usage: npm run data:dry-run [-- 2026-10-19]
 */
import { config } from "dotenv";
import { runEngine } from "../src/lib/engine";
import { loadCaseData } from "../src/lib/services/csvLoader";
import { buildRunInput } from "../src/lib/services/runInput";

config({ path: ".env.local" });
config();

const dataDir = process.env.DATA_DIR;
if (!dataDir) throw new Error("DATA_DIR is not set");
const data = loadCaseData(dataDir);
const runDate = process.argv[2] ?? data.inventory.map((i) => i.asOfDate).sort().at(-1)!;
const res = runEngine(buildRunInput({ ...data, eventFlags: [] }, runDate));

console.log(`Run ${runDate}: ${res.status}${res.haltReason ? ` — ${res.haltReason}` : ""}`);
console.log("Flags:", JSON.stringify(res.totals.byFlag), `exception rate ${(res.totals.exceptionRate * 100).toFixed(0)}%`);
console.log(`Guardrail (${res.totals.guardrailBasis}): ${res.totals.recommendedQty} vs baseline ${res.totals.baselineQty} → ${res.totals.guardrailRatio.toFixed(2)}×`);
for (const w of res.warnings) console.log("  !", w);
console.log();
for (const r of res.results)
  console.log(`${r.skuCode} ${r.flag.padEnd(13)} qty=${String(r.qty).padStart(5)} WOC=${r.weeksOfCover.toFixed(1).padStart(5)}  ${r.reason}`);
