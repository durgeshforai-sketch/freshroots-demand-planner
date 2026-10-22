import { NextResponse } from "next/server";
import { handler, parseJson } from "@/lib/api";
import { createRun, listRuns } from "@/lib/services/planning";
import { createRunSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handler("POST /api/runs", async (req: Request) => {
  const { runDate } = await parseJson(req, createRunSchema);
  return NextResponse.json(await createRun(runDate), { status: 201 });
});

export const GET = handler("GET /api/runs", async () => NextResponse.json(await listRuns()));
