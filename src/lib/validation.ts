import { z } from "zod";
import { reasonCodeList } from "@/config/reasonCodes";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD").refine((s) => !Number.isNaN(Date.parse(s)), "invalid date");
const name = z.string().trim().min(1).max(80);

export const createRunSchema = z.object({ runDate: isoDay.optional() });

export const recQuerySchema = z.object({
  runId: z.coerce.number().int().positive().optional(),
  flag: z.enum(["STOCKOUT_RISK", "OVERSTOCK", "HIGH_DEMAND", "WATCH", "OK", "EXCEPTION"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "OVERRIDDEN", "REJECTED"]).optional(),
  perishable: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const decisionSchema = z.object({
  action: z.enum(["APPROVE", "OVERRIDE", "REJECT"]),
  newQty: z.number().int().min(0).max(10_000_000).optional(),
  reasonCode: z.enum(reasonCodeList),
  note: z.string().trim().max(500).optional(),
  decidedBy: name.default("Raghav Kulkarni"),
});

export const preplacementSchema = z.object({
  owner: name.optional(),
  ownerDecision: z.enum(["PROCEED", "REDUCE", "CANCEL"]).optional(),
  ownerNote: z.string().trim().max(500).optional(),
});

export const exceptionsQuerySchema = z.object({ runId: z.coerce.number().int().positive().optional() });

export const flagSchema = z.object({
  skuCode: z.string().trim().min(1).optional(),
  distributorCode: z.string().trim().min(1).optional(),
  startDate: isoDay,
  endDate: isoDay,
  note: z.string().trim().min(3).max(300),
  createdBy: name,
});

export const query = (req: Request) => Object.fromEntries(new URL(req.url).searchParams);
