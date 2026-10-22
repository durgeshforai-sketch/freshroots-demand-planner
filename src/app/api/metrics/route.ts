import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { getMetrics } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

export const GET = handler("GET /api/metrics", async () => NextResponse.json(await getMetrics()));
