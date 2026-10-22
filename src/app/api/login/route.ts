import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { issueToken, passwordMatches, SESSION_COOKIE } from "@/lib/auth";
import { logger } from "@/lib/logger";

const schema = z.object({ password: z.string().min(1), next: z.string().optional() });

export const POST = handler("POST /api/login", async (req: Request) => {
  if (!process.env.APP_PASSWORD) throw new ApiError(503, "NOT_CONFIGURED", "APP_PASSWORD is not set on the server");
  const ct = req.headers.get("content-type") ?? "";
  const raw = ct.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const { password, next } = schema.parse(raw);
  if (!passwordMatches(password)) {
    logger.warn("auth.failed");
    throw new ApiError(401, "INVALID_PASSWORD", "Wrong password");
  }
  const { value, maxAge } = issueToken();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.json({ ok: true, next: safeNext });
  res.cookies.set(SESSION_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
  logger.info("auth.login");
  return res;
});
