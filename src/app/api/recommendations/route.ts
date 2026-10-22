import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { listRecommendations } from "@/lib/services/planning";
import { query, recQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler("GET /api/recommendations", async (req: Request) =>
  NextResponse.json(await listRecommendations(recQuerySchema.parse(query(req)))),
);
