/**
 * Load the case CSVs from DATA_DIR into Postgres. Idempotent: every row is an upsert.
 * Writes data-quality.md with counts, rejects and missing fields.
 * Usage: npm run data:ingest
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { writeFileSync } from "node:fs";
import { loadCaseData, missingFields } from "../src/lib/services/csvLoader";

const day = (s: string) => new Date(`${s}T00:00:00Z`);

async function main() {
  const dataDir = process.env.DATA_DIR;
  if (!dataDir) throw new Error("DATA_DIR is not set");
  const { prisma } = await import("../src/lib/db");
  const d = loadCaseData(dataDir);

  for (const x of d.distributors)
    await prisma.distributor.upsert({ where: { code: x.code }, create: x, update: x });

  for (const s of d.skus) {
    const data = { ...s, unitPrice: s.unitPrice ?? undefined };
    await prisma.sku.upsert({ where: { code: s.code }, create: data, update: data });
  }

  // Sales in batched transactions (Neon HTTP/WebSocket round-trips are the slow part).
  const CHUNK = 100;
  for (let i = 0; i < d.sales.length; i += CHUNK) {
    await prisma.$transaction(
      d.sales.slice(i, i + CHUNK).map((s) =>
        prisma.weeklySale.upsert({
          where: { skuCode_distributorCode_weekStart: { skuCode: s.skuCode, distributorCode: s.distributorCode, weekStart: day(s.weekStart) } },
          create: { ...s, weekStart: day(s.weekStart) },
          update: { units: s.units },
        }),
      ),
    );
  }

  for (const v of d.inventory)
    await prisma.inventorySnapshot.upsert({
      where: { skuCode_asOfDate: { skuCode: v.skuCode, asOfDate: day(v.asOfDate) } },
      create: { ...v, asOfDate: day(v.asOfDate) },
      update: { onHand: v.onHand, onOrder: v.onOrder, location: v.location },
    });

  for (const f of d.festivals)
    await prisma.festival.upsert({
      where: { name_startDate: { name: f.name, startDate: day(f.startDate) } },
      create: { ...f, startDate: day(f.startDate), endDate: day(f.endDate) },
      update: { endDate: day(f.endDate), region: f.region },
    });

  const counts = {
    Sku: await prisma.sku.count(),
    Distributor: await prisma.distributor.count(),
    WeeklySale: await prisma.weeklySale.count(),
    InventorySnapshot: await prisma.inventorySnapshot.count(),
    Festival: await prisma.festival.count(),
  };

  const weeks = [...new Set(d.sales.map((s) => s.weekStart))].sort();
  const md = [
    "# Data quality report",
    "",
    `Generated: ${new Date().toISOString()}  `,
    `Source: \`DATA_DIR\` (${Object.keys(d.rawCounts).length} CSV files)`,
    "",
    "## Rows read → loaded",
    "| File | Rows read |",
    "|---|---|",
    ...Object.entries(d.rawCounts).map(([f, n]) => `| ${f} | ${n} |`),
    "",
    "| Table | Rows in DB |",
    "|---|---|",
    ...Object.entries(counts).map(([t, n]) => `| ${t} | ${n} |`),
    "",
    `Sales weeks: ${weeks.length} (${weeks[0]} → ${weeks.at(-1)}, week-start Mondays).`,
    "",
    `## Rejects (${d.rejects.length})`,
    d.rejects.length ? "| File | Line | Reason |\n|---|---|---|\n" + d.rejects.map((r) => `| ${r.file} | ${r.line} | ${r.reason} |`).join("\n") : "None.",
    "",
    "## Missing fields",
    ...missingFields(d).map((m) => `- ${m}`),
    "",
    "## Notes",
    ...(d.notes.length ? d.notes.map((n) => `- ${n}`) : ["- None."]),
    "- Sample size: 15 SKUs / 4 distributors / 16 weeks vs ~400 SKUs / ~1,200 distributors / 3 years in production.",
    "",
  ].join("\n");
  writeFileSync("data-quality.md", md);

  console.log(JSON.stringify({ event: "ingest.done", counts, rejects: d.rejects.length }));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(JSON.stringify({ event: "ingest.failed", message: String(e?.message ?? e) }));
  process.exit(1);
});
