// CSV read/write for import/export.

import { nonNegative, uid } from "./helpers.js";
import { WORKSHEET_DEFS, WORKSHEET_ORDER } from "./data.js";

// ---- Low-level CSV parsing ----

export function parseCsv(text) {
  // Strip UTF-8 BOM that Excel on Windows prepends to CSV files.
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

export function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  // Prefix formula-trigger characters so spreadsheet apps don't execute
  // user-supplied text as formulas when the CSV is opened in Excel / Sheets.
  const safe = /^[=+\-@\t\r]/.test(str) ? "'" + str : str;
  if (/[",\n\r]/.test(safe)) return '"' + safe.replace(/"/g, '""') + '"';
  return safe;
}

export function toCsv(headers, rows) {
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  });
  return lines.join("\r\n");
}

// ---- CIP serialization ----

const CSV_HEADERS = [
  "section", "worksheet", "row_id", "row_label", "custom_name",
  "year", "amount", "notes",
  "local_funds", "grant_funds", "debt_service",
  "key", "value",
];

export function serializeSession(state) {
  const rows = [];
  // Metadata
  rows.push({ section: "meta", key: "townName", value: state.metadata.townName });
  rows.push({ section: "meta", key: "preparedBy", value: state.metadata.preparedBy });
  rows.push({ section: "meta", key: "dateAdopted", value: state.metadata.dateAdopted });
  rows.push({ section: "meta", key: "startYear", value: state.startYear });
  rows.push({ section: "meta", key: "numYears", value: state.numYears });

  // Budget years
  state.budgetYears.forEach((by) => {
    rows.push({
      section: "budget_year",
      year: by.year,
      local_funds: by.local,
      grant_funds: by.grant,
      debt_service: by.debt || 0,
    });
  });

  // Worksheet rows
  WORKSHEET_ORDER.forEach((wsId) => {
    const ws = state.worksheets[wsId];
    if (!ws) return;
    ws.rows.forEach((row) => {
      // One row per year-cell with an amount > 0, plus one row for notes-only
      const hasValues = state.budgetYears.some((by) => (row.values[by.year] || 0) > 0);
      if (hasValues) {
        state.budgetYears.forEach((by) => {
          const amt = row.values[by.year] || 0;
          if (amt > 0) {
            rows.push({
              section: "cell",
              worksheet: wsId,
              row_id: row.id,
              row_label: row.label,
              custom_name: row.customName || "",
              year: by.year,
              amount: amt,
            });
          }
        });
      }
      if (row.notes || row.customName) {
        rows.push({
          section: "row_meta",
          worksheet: wsId,
          row_id: row.id,
          row_label: row.label,
          custom_name: row.customName || "",
          notes: row.notes || "",
        });
      }
    });
  });

  // Global notes
  if (state.globalNotes) {
    rows.push({ section: "note", notes: state.globalNotes });
  }

  return toCsv(CSV_HEADERS, rows);
}

export function parseSessionCsv(text) {
  const records = parseCsv(text);
  const result = {
    metadata: {},
    budgetYears: [],
    cells: [],       // { worksheet, rowId, year, amount }
    rowMeta: [],     // { worksheet, rowId, customName, notes }
    globalNotes: null,
  };
  const counts = { budget_year: 0, cell: 0, row_meta: 0 };

  records.forEach((r) => {
    switch (r.section) {
      case "meta":
        result.metadata[r.key] = r.value || "";
        break;
      case "budget_year":
        result.budgetYears.push({
          year: r.year,
          local: nonNegative(r.local_funds),
          grant: nonNegative(r.grant_funds),
          debt: nonNegative(r.debt_service),
        });
        counts.budget_year++;
        break;
      case "cell":
        result.cells.push({
          worksheet: r.worksheet,
          rowId: r.row_id,
          year: r.year,
          amount: nonNegative(r.amount),
        });
        counts.cell++;
        break;
      case "row_meta":
        result.rowMeta.push({
          worksheet: r.worksheet,
          rowId: r.row_id,
          customName: r.custom_name || "",
          notes: r.notes || "",
        });
        counts.row_meta++;
        break;
      case "note":
        result.globalNotes = r.notes || "";
        break;
      default:
        break;
    }
  });

  const parts = [];
  if (counts.budget_year) parts.push(counts.budget_year + " budget year(s)");
  if (counts.cell) parts.push(counts.cell + " cell value(s)");
  if (counts.row_meta) parts.push(counts.row_meta + " row(s) with notes/names");
  if (result.globalNotes !== null) parts.push("notes");
  result.summary = parts.length ? parts.join(", ") : "nothing recognizable";
  return result;
}

export function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
