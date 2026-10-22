import { engineConfig, type EngineConfig } from "@/config/engine";

export interface PreplacementInput {
  /** AVG4 stored on the approved recommendation. */
  avg4AtRecommendation: number;
  /** Units in the latest complete week now (null if no new week has landed). */
  latestWeekUnits: number | null;
  /** Top distributors for the SKU: their AVG4 at recommendation vs their latest week now. */
  distributors: { code: string; baselineAvg4: number; latestUnits: number }[];
  /** E3 flags created after approval that touch this SKU or its distributors. */
  newEventFlags: { note: string }[];
}

export interface PreplacementResult {
  result: "PROCEED" | "HOLD";
  triggers: string[];
}

/** Hold an approved order if the market moved since approval. A named owner then decides. */
export function preplacementCheck(input: PreplacementInput, cfg: EngineConfig = engineConfig): PreplacementResult {
  const p = cfg.preplacement;
  const triggers: string[] = [];

  if (input.latestWeekUnits !== null && input.avg4AtRecommendation > 0) {
    const delta = input.latestWeekUnits / input.avg4AtRecommendation - 1;
    if (Math.abs(delta) >= p.latestWeekDelta)
      triggers.push(`Latest week ${input.latestWeekUnits} units is ${Math.round(delta * 100)}% vs AVG4 ${Math.round(input.avg4AtRecommendation)} at approval.`);
  }

  const top = [...input.distributors].sort((a, b) => b.baselineAvg4 - a.baselineAvg4).slice(0, p.topDistributors);
  for (const d of top) {
    if (d.baselineAvg4 <= 0) continue;
    const change = d.latestUnits / d.baselineAvg4 - 1;
    if (change <= -p.distributorCut)
      triggers.push(`Distributor ${d.code} cut ${Math.round(-change * 100)}% (${d.latestUnits} vs ${Math.round(d.baselineAvg4)}/week).`);
  }

  for (const f of input.newEventFlags) triggers.push(`New market event flag: ${f.note}`);

  return { result: triggers.length ? "HOLD" : "PROCEED", triggers };
}
