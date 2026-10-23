import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { logger } from "@/lib/logger";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError(404, "NOT_FOUND", `${what} not found`);
export const conflict = (message: string) => new ApiError(409, "CONFLICT", message);
export const badRequest = (message: string) => new ApiError(400, "BAD_REQUEST", message);

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Wrap a route handler: consistent `{ error: { code, message } }` bodies and structured logs. */
export function handler<A extends unknown[]>(name: string, fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const started = Date.now();
    try {
      const res = await fn(...args);
      logger.info("api.request", { route: name, status: res.status, ms: Date.now() - started });
      return res;
    } catch (e) {
      if (e instanceof ApiError) {
        logger.warn("api.error", { route: name, status: e.status, code: e.code, message: e.message });
        return errorResponse(e.status, e.code, e.message);
      }
      if (e instanceof ZodError) {
        const message = e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
        logger.warn("api.validation", { route: name, message });
        return errorResponse(400, "VALIDATION_ERROR", message);
      }
      logger.error("api.unhandled", { route: name, message: e instanceof Error ? e.message : String(e) });
      return errorResponse(500, "INTERNAL", "Unexpected server error");
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown = {};
  const text = await req.text();
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      throw badRequest("Body is not valid JSON");
    }
  }
  return schema.parse(body);
}

export function parseId(raw: string, what = "id"): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`${what} must be a positive integer`);
  return n;
}
