/**
 * Print row counts and sample rows for every table.
 * Usage: npm run data:check
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { prisma } = await import("../src/lib/db");
  const tables = {
    Sku: prisma.sku,
    Distributor: prisma.distributor,
    WeeklySale: prisma.weeklySale,
    InventorySnapshot: prisma.inventorySnapshot,
    Festival: prisma.festival,
    EventFlag: prisma.eventFlag,
    Run: prisma.run,
    Recommendation: prisma.recommendation,
    RecException: prisma.recException,
    Decision: prisma.decision,
    PreplacementCheck: prisma.preplacementCheck,
  } as const;

  for (const [name, delegate] of Object.entries(tables)) {
    // Each delegate has count/findMany; the union type is too wide for TS to call directly.
    const d = delegate as unknown as { count: () => Promise<number>; findMany: (a: { take: number }) => Promise<unknown[]> };
    const n = await d.count();
    console.log(`\n${name}: ${n} rows`);
    for (const row of await d.findMany({ take: 3 })) console.log("  ", JSON.stringify(row));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
