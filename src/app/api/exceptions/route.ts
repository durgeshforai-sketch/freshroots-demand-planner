import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { listExceptions } from "@/lib/services/planning";
import { exceptionsQuerySchema, query } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler("GET /api/exceptions", async (req: Request) => {
  const { runId } = exceptionsQuerySchema.parse(query(req));
  return NextResponse.json(await listExceptions(runId));
});
