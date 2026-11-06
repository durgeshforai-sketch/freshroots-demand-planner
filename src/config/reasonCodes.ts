/** Reason codes for planner decisions. Keep short; they feed the override-rate review with Deepa. */
export const reasonCodes = {
  AGREE: "Agree with engine",
  LOCAL_KNOWLEDGE: "Local / distributor knowledge",
  SCHEME_OR_PROMO: "Competitor or own scheme",
  NEW_LAUNCH: "New launch / range change",
  SUPPLY_CONSTRAINT: "Supplier or capacity constraint",
  SHELF_LIFE: "Shelf-life / perishability risk",
  DATA_ERROR: "Data looks wrong",
  OTHER: "Other (see note)",
} as const;

export type ReasonCode = keyof typeof reasonCodes;
export const reasonCodeList = Object.keys(reasonCodes) as [ReasonCode, ...ReasonCode[]];
