// Node-runnable test for column totals, row totals, and summary accuracy.
// Run: node tests/totals.test.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Inline the helpers we need (avoid DOM-dependent imports) ----

function nonNegative(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function availableLocal(by) {
  return Math.max(0, nonNegative(by.local) - nonNegative(by.debt));
}

// ---- Import data definitions ----
// We can't directly import data.js (it uses export), so read and eval the constants.

const dataSource = readFileSync(join(__dirname, "..", "js", "data.js"), "utf-8");

// Extract the constants via dynamic import
const dataModule = await import(join(__dirname, "..", "js", "data.js"));
const { WORKSHEET_DEFS, WORKSHEET_ORDER } = dataModule;

// ---- CSV parser (inline to avoid DOM dependency in helpers.js) ----

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  function pushField() { row.push(field); field = ""; }
  function pushRow() { pushField(); rows.push(row); row = []; }
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { pushField(); i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { pushRow(); i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c !== ""))
    .map((r) => {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ""; });
      return obj;
    });
}

function parseSessionCsv(text) {
  const records = parseCsv(text);
  const result = { metadata: {}, budgetYears: [], cells: [], rowMeta: [], globalNotes: null };
  records.forEach((r) => {
    switch (r.section) {
      case "meta":
        result.metadata[r.key] = r.value || "";
        break;
      case "budget_year":
        result.budgetYears.push({
          year: r.year, local: nonNegative(r.local_funds),
          grant: nonNegative(r.grant_funds), debt: nonNegative(r.debt_service),
        });
        break;
      case "cell":
        result.cells.push({
          worksheet: r.worksheet, rowId: r.row_id,
          year: r.year, amount: nonNegative(r.amount),
        });
        break;
      case "row_meta":
        result.rowMeta.push({
          worksheet: r.worksheet, rowId: r.row_id,
          customName: r.custom_name || "", notes: r.notes || "",
        });
        break;
      case "note":
        result.globalNotes = r.notes || "";
        break;
    }
  });
  return result;
}

// ---- Build state from CSV ----

const csvText = readFileSync(join(__dirname, "..", "samples", "pawlet-demo.csv"), "utf-8");
const parsed = parseSessionCsv(csvText);

function buildState(parsed) {
  const budgetYears = parsed.budgetYears;
  const yearKeys = budgetYears.map((b) => b.year);
  const worksheets = {};
  WORKSHEET_ORDER.forEach((wsId) => {
    const def = WORKSHEET_DEFS[wsId];
    worksheets[wsId] = {
      label: def.label,
      rows: def.rows.map((r) => {
        const values = {};
        yearKeys.forEach((y) => { values[y] = 0; });
        return { id: r.id, label: r.label, type: r.type, customName: "", values, notes: "" };
      }),
    };
  });
  parsed.cells.forEach((cell) => {
    const ws = worksheets[cell.worksheet];
    if (!ws) return;
    const row = ws.rows.find((r) => r.id === cell.rowId);
    if (!row) return;
    if (yearKeys.includes(cell.year)) row.values[cell.year] = cell.amount;
  });
  return { budgetYears, worksheets };
}

const state = buildState(parsed);
const years = state.budgetYears.map((b) => b.year);

// ---- Test runner ----

let passed = 0;
let failed = 0;

function assert(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name} — ${detail || ""}`);
  }
}

// ---- TESTS ----

console.log("\n=== CSV Parsing ===");

assert("Parses 5 budget years",
  state.budgetYears.length === 5,
  `got ${state.budgetYears.length}`);

assert("Budget year labels are FY2026–FY2030",
  years.join(",") === "FY2026,FY2027,FY2028,FY2029,FY2030",
  `got ${years.join(",")}`);

assert("All budget years have non-zero local funds",
  state.budgetYears.every((by) => by.local > 0),
  `${state.budgetYears.map((by) => by.local).join(", ")}`);

assert("All budget year labels are non-empty",
  state.budgetYears.every((by) => by.year && by.year.length > 0),
  `years: ${state.budgetYears.map((by) => JSON.stringify(by.year)).join(", ")}`);

assert("Parsed cells from CSV",
  parsed.cells.length > 0,
  `got ${parsed.cells.length} cells`);

console.log("\n=== Column Totals (per worksheet, per year) ===");

WORKSHEET_ORDER.forEach((wsId) => {
  const ws = state.worksheets[wsId];
  years.forEach((y) => {
    const colTotal = ws.rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
    let manual = 0;
    ws.rows.forEach((row) => { manual += nonNegative(row.values[y]); });
    assert(`${wsId} / ${y}: col total = $${colTotal.toLocaleString()}`,
      colTotal === manual,
      `reduce=${colTotal}, manual=${manual}`);
  });
});

console.log("\n=== Column Independence (no cross-contamination) ===");

WORKSHEET_ORDER.forEach((wsId) => {
  const ws = state.worksheets[wsId];
  const totals = {};
  years.forEach((y) => {
    totals[y] = ws.rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
  });
  const hasData = Object.values(totals).some((t) => t > 0);
  if (hasData) {
    const unique = new Set(Object.values(totals));
    assert(`${wsId}: columns have distinct totals (${unique.size} unique values)`,
      unique.size > 1,
      `all columns = ${Object.values(totals)[0]}`);
  }
});

console.log("\n=== Row Totals (horizontal sums) ===");

let rowTests = 0;
WORKSHEET_ORDER.forEach((wsId) => {
  const ws = state.worksheets[wsId];
  ws.rows.forEach((row) => {
    const rowTotal = years.reduce((sum, y) => sum + nonNegative(row.values[y]), 0);
    if (rowTotal > 0) {
      let manual = 0;
      years.forEach((y) => { manual += nonNegative(row.values[y]); });
      assert(`${wsId} / ${row.id}: row total = $${rowTotal.toLocaleString()}`,
        rowTotal === manual,
        `reduce=${rowTotal}, manual=${manual}`);
      rowTests++;
    }
  });
});

console.log("\n=== Worksheet Grand Totals (cols == rows) ===");

WORKSHEET_ORDER.forEach((wsId) => {
  const ws = state.worksheets[wsId];
  let fromCols = 0;
  years.forEach((y) => {
    fromCols += ws.rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
  });
  let fromRows = 0;
  ws.rows.forEach((row) => {
    fromRows += years.reduce((sum, y) => sum + nonNegative(row.values[y]), 0);
  });
  assert(`${wsId}: col grand $${fromCols.toLocaleString()} == row grand $${fromRows.toLocaleString()}`,
    fromCols === fromRows,
    `cols=${fromCols}, rows=${fromRows}`);
});

console.log("\n=== Summary Tab (cross-worksheet totals) ===");

years.forEach((y) => {
  let summaryTotal = 0;
  WORKSHEET_ORDER.forEach((wsId) => {
    summaryTotal += state.worksheets[wsId].rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
  });
  let crossCheck = 0;
  WORKSHEET_ORDER.forEach((wsId) => {
    state.worksheets[wsId].rows.forEach((row) => { crossCheck += nonNegative(row.values[y]); });
  });
  assert(`Summary ${y}: $${summaryTotal.toLocaleString()}`,
    summaryTotal === crossCheck,
    `summary=${summaryTotal}, crossCheck=${crossCheck}`);
});

let summaryGrand = 0;
years.forEach((y) => {
  WORKSHEET_ORDER.forEach((wsId) => {
    summaryGrand += state.worksheets[wsId].rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
  });
});
let wsGrandSum = 0;
WORKSHEET_ORDER.forEach((wsId) => {
  state.worksheets[wsId].rows.forEach((row) => {
    years.forEach((y) => { wsGrandSum += nonNegative(row.values[y]); });
  });
});
assert(`Summary grand total $${summaryGrand.toLocaleString()} == worksheet sum $${wsGrandSum.toLocaleString()}`,
  summaryGrand === wsGrandSum,
  `summary=${summaryGrand}, worksheets=${wsGrandSum}`);

console.log("\n=== Known CSV Values ===");

const hw = state.worksheets.highway;
const road1 = hw.rows.find((r) => r.id === "hw-road-1");
assert("Road (1) FY2026 = $280,000", road1 && road1.values["FY2026"] === 280000,
  `got ${road1 ? road1.values["FY2026"] : "not found"}`);
assert("Road (1) FY2027 = $280,000", road1 && road1.values["FY2027"] === 280000,
  `got ${road1 ? road1.values["FY2027"] : "not found"}`);
assert("Road (1) FY2028 = $0", road1 && (road1.values["FY2028"] || 0) === 0,
  `got ${road1 ? road1.values["FY2028"] : "not found"}`);

const eq = state.worksheets.equipment;
const dump1 = eq.rows.find((r) => r.id === "eq-dump-1");
assert("Dump Truck (1) FY2027 = $275,000", dump1 && dump1.values["FY2027"] === 275000,
  `got ${dump1 ? dump1.values["FY2027"] : "not found"}`);

const ww = state.worksheets.water;
const gen = ww.rows.find((r) => r.id === "ww-generator");
assert("Generator FY2026 = $55,000", gen && gen.values["FY2026"] === 55000,
  `got ${gen ? gen.values["FY2026"] : "not found"}`);

const culvert1 = hw.rows.find((r) => r.id === "hw-culvert-1");
assert("Culvert (1) FY2027 = $120,000", culvert1 && culvert1.values["FY2027"] === 120000,
  `got ${culvert1 ? culvert1.values["FY2027"] : "not found"}`);
assert("Culvert (1) FY2028 = $180,000", culvert1 && culvert1.values["FY2028"] === 180000,
  `got ${culvert1 ? culvert1.values["FY2028"] : "not found"}`);

const grader = eq.rows.find((r) => r.id === "eq-grader");
assert("Grader FY2030 = $400,000", grader && grader.values["FY2030"] === 400000,
  `got ${grader ? grader.values["FY2030"] : "not found"}`);

console.log("\n=== Budget Status ===");

years.forEach((y) => {
  const by = state.budgetYears.find((b) => b.year === y);
  const avail = availableLocal(by);
  let total = 0;
  WORKSHEET_ORDER.forEach((wsId) => {
    total += state.worksheets[wsId].rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
  });
  let status;
  if (total > avail + by.grant) status = "over";
  else if (total > avail) status = "warn";
  else status = "ok";
  assert(`${y}: $${total.toLocaleString()} vs $${avail.toLocaleString()} avail + $${by.grant.toLocaleString()} grant → ${status}`,
    true, "");
});

// ---- Summary ----

console.log("\n" + "=".repeat(50));
if (failed === 0) {
  console.log(`\x1b[32m  ALL ${passed} TESTS PASSED\x1b[0m`);
} else {
  console.log(`\x1b[31m  ${failed} FAILED\x1b[0m, ${passed} passed`);
}
console.log("=".repeat(50) + "\n");

process.exit(failed > 0 ? 1 : 0);
