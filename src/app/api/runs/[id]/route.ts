import { NextResponse, type NextRequest } from "next/server";
import { handler, parseId } from "@/lib/api";
import { getRun } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

export const GET = handler("GET /api/runs/[id]", async (_req: NextRequest, ctx: RouteContext<"/api/runs/[id]">) => {
  const { id } = await ctx.params;
  return NextResponse.json(await getRun(parseId(id)));
});
