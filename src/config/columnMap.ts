/**
 * CSV → database column mapping. Confirmed by the user on 2026-10-22 (Step 0, A2.3).
 * Source files live in DATA_DIR. Fields marked `derived` or `default` are not in the CSVs.
 */

export const columnMap = {
  sku: {
    file: "sku_master.csv",
    columns: {
      code: "SKU_ID",
      name: "SKU_Name",
      category: "Category",
      isPerishable: { from: "Perishability", transform: "High → true, Low → false" },
      standardReorderQty: "Standard_Reorder_Qty", // extra column, not in spec
      unitOfMeasure: "Unit_of_Measure", // extra column, not in spec
      primaryDistributorCode: "Distributor_ID", // extra: one distributor per SKU
    },
    missing: {
      unitPrice: "null → E6 and order value skipped, with a warning",
      casePack: "default 1",
      leadTimeWeeks: "null → E5 skipped, with a warning",
    },
  },

  distributor: {
    file: "distributor_master.csv",
    columns: {
      code: "Distributor_ID",
      name: "Distributor_Name",
      region: "Region",
      status: "Status", // extra column, not in spec
    },
    missing: { tier: "null" },
  },

  weeklySale: {
    file: "weekly_sales.csv",
    columns: {
      skuCode: "SKU_ID",
      weekStart: { from: "Week", transform: "ISO week 'YYYY-Www' → Monday date" },
      units: "Units_Sold",
    },
    derived: {
      distributorCode: "sku_master.Distributor_ID (sales file has no distributor column)",
    },
  },

  inventorySnapshot: {
    file: "current_inventory.csv",
    columns: {
      skuCode: "SKU_ID",
      location: "Location", // extra column, not in spec
      onHand: "Units_On_Hand",
      asOfDate: "As_Of_Date",
    },
    missing: { onOrder: "null → treated as 0 and labelled 'on-order unavailable'" },
  },

  festival: {
    file: "calendar.csv",
    columns: {
      // One Festival row per month flagged TRUE.
      name: { from: "Year_Month", transform: "'Festival month YYYY-MM'" },
      startDate: { from: "Year, Month", transform: "1st of month" },
      endDate: { from: "Year, Month", transform: "last day of month" },
    },
    filter: "Is_Festival_Month = TRUE",
    missing: { region: "null (applies everywhere)", realNamesAndDates: "not provided" },
  },
} as const;
