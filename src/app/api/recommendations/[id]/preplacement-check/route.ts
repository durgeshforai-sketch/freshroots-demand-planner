import { NextResponse, type NextRequest } from "next/server";
import { handler, parseId, parseJson } from "@/lib/api";
import { runPreplacementCheck } from "@/lib/services/planning";
import { preplacementSchema } from "@/lib/validation";

export const POST = handler(
  "POST /api/recommendations/[id]/preplacement-check",
  async (req: NextRequest, ctx: RouteContext<"/api/recommendations/[id]/preplacement-check">) => {
    const { id } = await ctx.params;
    const body = await parseJson(req, preplacementSchema);
    return NextResponse.json(await runPreplacementCheck(parseId(id), body), { status: 201 });
  },
);
