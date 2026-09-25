// Worksheet definitions and default budget for the CIP tool.

export const DEFAULT_START_YEAR = 2028;
export const DEFAULT_NUM_YEARS = 5;

export const DEFAULT_BUDGET = {
  annualLocal: 800000,
  annualGrantAvg: 150000,
  annualDebtService: 0,
};

// Each worksheet defines the row slots a town fills in. Row types:
//   fixed  - label is immutable (e.g. "Highway Garage")
//   named  - generic slot where the user enters a specific name
//   other  - overflow for items that don't fit the named slots
export const WORKSHEET_DEFS = {
  highway: {
    label: "Highway Infrastructure",
    rows: [
      { id: "hw-garage",    label: "Highway Garage",  type: "fixed" },
      { id: "hw-salt",      label: "Salt Shed",       type: "fixed" },
      { id: "hw-road-1",    label: "Road (1)",        type: "named" },
      { id: "hw-road-2",    label: "Road (2)",        type: "named" },
      { id: "hw-road-3",    label: "Road (3)",        type: "named" },
      { id: "hw-road-4",    label: "Road (4)",        type: "named" },
      { id: "hw-bridge-1",  label: "Bridge (1)",      type: "named" },
      { id: "hw-bridge-2",  label: "Bridge (2)",      type: "named" },
      { id: "hw-culvert-1", label: "Large Culvert (1)", type: "named" },
      { id: "hw-culvert-2", label: "Large Culvert (2)", type: "named" },
      { id: "hw-stormwater", label: "Stormwater",     type: "fixed" },
      { id: "hw-other-1",   label: "Other",           type: "other" },
      { id: "hw-other-2",   label: "Other",           type: "other" },
      { id: "hw-other-3",   label: "Other",           type: "other" },
      { id: "hw-other-4",   label: "Other",           type: "other" },
    ],
  },
  facilities: {
    label: "Community Facilities",
    rows: [
      { id: "fac-town-hall",    label: "Town Hall",          type: "fixed" },
      { id: "fac-fire-station", label: "Fire Station",       type: "fixed" },
      { id: "fac-library",      label: "Library",            type: "fixed" },
      { id: "fac-school",       label: "School / Community Center", type: "fixed" },
      { id: "fac-town-office",  label: "Town Office",        type: "fixed" },
      { id: "fac-other-1",      label: "Other",              type: "other" },
      { id: "fac-other-2",      label: "Other",              type: "other" },
      { id: "fac-other-3",      label: "Other",              type: "other" },
      { id: "fac-other-4",      label: "Other",              type: "other" },
    ],
  },
  water: {
    label: "Water & Wastewater",
    rows: [
      { id: "ww-tank",       label: "Water Storage Tank",      type: "fixed" },
      { id: "ww-mains",      label: "Water Mains",             type: "named" },
      { id: "ww-plant",      label: "Wastewater Treatment Plant", type: "fixed" },
      { id: "ww-pump",       label: "Pump Station",            type: "named" },
      { id: "ww-generator",  label: "Backup Generator",        type: "fixed" },
      { id: "ww-other-1",    label: "Other",                   type: "other" },
      { id: "ww-other-2",    label: "Other",                   type: "other" },
      { id: "ww-other-3",    label: "Other",                   type: "other" },
    ],
  },
  equipment: {
    label: "Highway Equipment",
    rows: [
      { id: "eq-plow-1",    label: "Plow Truck (1)",   type: "named" },
      { id: "eq-plow-2",    label: "Plow Truck (2)",   type: "named" },
      { id: "eq-grader",    label: "Grader",           type: "fixed" },
      { id: "eq-loader",    label: "Loader",           type: "fixed" },
      { id: "eq-excavator", label: "Excavator / Backhoe", type: "fixed" },
      { id: "eq-pickup-1",  label: "Pickup / One-Ton (1)", type: "named" },
      { id: "eq-pickup-2",  label: "Pickup / One-Ton (2)", type: "named" },
      { id: "eq-small",     label: "Small Equipment & Attachments", type: "fixed" },
      { id: "eq-fire",      label: "Fire Apparatus",   type: "named" },
      { id: "eq-other-1",   label: "Other",            type: "other" },
      { id: "eq-other-2",   label: "Other",            type: "other" },
      { id: "eq-other-3",   label: "Other",            type: "other" },
    ],
  },
};

export const WORKSHEET_ORDER = ["highway", "facilities", "water", "equipment"];
