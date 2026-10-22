// Prisma 7 reads connection settings here, not from schema.prisma.
// The CLI (migrate, introspect) uses the direct, non-pooled DIRECT_URL;
// the app connects with the pooled DATABASE_URL via the Neon adapter (src/lib/db.ts).
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
