import { engineConfig, type EngineConfig } from "@/config/engine";

export interface KillMetricInput {
  decisions: { approve: number; override: number; reject: number };
  recommendations: number;
  exceptions: number;
}

export interface KillMetrics {
  overrideRate: number; // (override + reject) / decisions
  overrideWarn: boolean;
  exceptionRate: number;
  exceptionBand: "below" | "within" | "above";
  expectedExceptionRate: { min: number; max: number };
  overrideRateWarnAt: number;
  killRule: string;
}

/** Reporting only — Deepa decides. Never changes engine behaviour. */
export function computeKillMetrics(input: KillMetricInput, cfg: EngineConfig = engineConfig): KillMetrics {
  const k = cfg.killMetrics;
  const decided = input.decisions.approve + input.decisions.override + input.decisions.reject;
  const overrideRate = decided ? (input.decisions.override + input.decisions.reject) / decided : 0;
  const exceptionRate = input.recommendations ? input.exceptions / input.recommendations : 0;
  const band =
    exceptionRate < k.expectedExceptionRate.min ? "below" : exceptionRate > k.expectedExceptionRate.max ? "above" : "within";
  return {
    overrideRate,
    overrideWarn: overrideRate > k.overrideRateWarn,
    exceptionRate,
    exceptionBand: band,
    expectedExceptionRate: k.expectedExceptionRate,
    overrideRateWarnAt: k.overrideRateWarn,
    killRule: `Kill the project if quarterly planning losses exceed ₹${(k.quarterlyLossKillRupees / 100_000).toFixed(0)} lakh against Raghav's manual plan.`,
  };
}
