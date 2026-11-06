export type Flag = "STOCKOUT_RISK" | "OVERSTOCK" | "HIGH_DEMAND" | "WATCH" | "OK" | "EXCEPTION";
export type ExceptionCode = "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7";

export interface WeekPoint {
  weekStart: string; // YYYY-MM-DD (Monday)
  units: number;
}

export interface DistributorSeries {
  code: string;
  weeks: WeekPoint[];
}

export interface FestivalWindow {
  name: string;
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
}

export interface EventFlagInput {
  id?: number;
  skuCode?: string | null;
  distributorCode?: string | null;
  startDate: string;
  endDate: string;
  note: string;
}

/** Everything the engine needs for one SKU. Built by the service layer from the DB. */
export interface SkuInput {
  code: string;
  name: string;
  isPerishable: boolean;
  standardReorderQty?: number | null;
  unitPrice?: number | null;
  casePack?: number | null;
  leadTimeWeeks?: number | null;
  /** SKU-level weekly totals (summed across distributors), complete weeks, any order. */
  weeks: WeekPoint[];
  /** Per-distributor weekly series, used only for E2. */
  distributors: DistributorSeries[];
  onHand: number | null; // null = no inventory snapshot
  onOrder: number | null; // null = on-order unavailable
  /** Data problems found by the loader (E4): duplicates, unmatched IDs, etc. */
  dataIssues?: string[];
}

export interface SkuStats {
  avg4: number;
  avg12: number;
  avg4Prev: number;
  avg12Prev: number;
  latestWeek: string | null;
  latestUnits: number | null;
  historyWeeks: number;
  missingWeeks: string[];
}

export interface ExceptionHit {
  code: ExceptionCode;
  detail: string;
}

export interface SkuResult {
  skuCode: string;
  flag: Flag;
  avg4: number;
  avg12: number;
  festivalFactor: number;
  demandRate: number; // R
  inventoryPosition: number; // IP
  weeksOfCover: number; // WOC
  qStd: number;
  qty: number; // 0 when no order or EXCEPTION
  suggestedQty: number; // engine's figure before exception routing (for Raghav's reference)
  orderValue: number | null;
  surgeConfirmed: boolean;
  surgeLatestOnly: boolean;
  onOrderAvailable: boolean;
  exceptions: ExceptionHit[];
  reason: string;
  warnings: string[];
}

export interface RunInput {
  runDate: string; // YYYY-MM-DD
  skus: SkuInput[];
  festivals: FestivalWindow[];
  eventFlags: EventFlagInput[];
  /** Known distributor codes; sales from others are an E4 data problem. */
  knownDistributors?: string[];
}

export interface RunResult {
  runDate: string;
  status: "COMPLETED" | "HALTED";
  haltReason: string | null;
  festivalFactor: number;
  results: SkuResult[]; // empty when HALTED
  totals: {
    skus: number;
    byFlag: Record<Flag, number>;
    exceptionRate: number;
    recommendedQty: number;
    baselineQty: number;
    recommendedValue: number | null;
    baselineValue: number | null;
    guardrailBasis: "value" | "units";
    guardrailRatio: number;
  };
  warnings: string[];
}
