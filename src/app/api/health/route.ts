import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { health } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await health());
  } catch (e) {
    logger.error("health.db_down", { message: e instanceof Error ? e.message : String(e) });
    return errorResponse(503, "DB_UNAVAILABLE", "Database is not reachable");
  }
}
