import { NextResponse, type NextRequest } from "next/server";
import { handler, parseId, parseJson } from "@/lib/api";
import { decide } from "@/lib/services/planning";
import { decisionSchema } from "@/lib/validation";

export const POST = handler(
  "POST /api/recommendations/[id]/decision",
  async (req: NextRequest, ctx: RouteContext<"/api/recommendations/[id]/decision">) => {
    const { id } = await ctx.params;
    const body = await parseJson(req, decisionSchema);
    return NextResponse.json(await decide(parseId(id), body), { status: 201 });
  },
);
