import { NextResponse, type NextRequest } from "next/server";
import { handler } from "@/lib/api";
import { skuDetail } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

export const GET = handler("GET /api/skus/[code]", async (_req: NextRequest, ctx: RouteContext<"/api/skus/[code]">) => {
  const { code } = await ctx.params;
  return NextResponse.json(await skuDetail(code));
});
