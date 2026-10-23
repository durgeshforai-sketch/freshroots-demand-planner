import { NextResponse } from "next/server";
import { handler, parseJson } from "@/lib/api";
import { createFlag } from "@/lib/services/planning";
import { flagSchema } from "@/lib/validation";

export const POST = handler("POST /api/flags", async (req: Request) =>
  NextResponse.json(await createFlag(await parseJson(req, flagSchema)), { status: 201 }),
);
