// Print and HTML export.

import { formatMoney, nonNegative, escapeHtml } from "./helpers.js";
import { WORKSHEET_ORDER } from "./data.js";
import { availableLocal } from "./budget.js";

export function buildExportHtml(state) {
  const years = state.budgetYears.map((b) => b.year);
  const townName = state.metadata.townName || "Town";

  let worksheetTablesHtml = "";
  WORKSHEET_ORDER.forEach((wsId) => {
    const ws = state.worksheets[wsId];
    if (!ws) return;

    let headerRow = "<tr><th>Project</th><th>Description</th>";
    years.forEach((y) => { headerRow += `<th>${escapeHtml(y)}</th>`; });
    headerRow += "<th>Total</th><th>Notes</th></tr>";

    let bodyRows = "";
    ws.rows.forEach((row) => {
      const rowTotal = years.reduce((sum, y) => sum + nonNegative(row.values[y]), 0);
      if (rowTotal === 0 && !row.customName && !row.notes) return;
      bodyRows += `<tr><td>${escapeHtml(row.label)}</td>`;
      bodyRows += `<td>${escapeHtml(row.customName || "")}</td>`;
      years.forEach((y) => {
        const v = row.values[y] || 0;
        bodyRows += `<td>${v > 0 ? formatMoney(v) : ""}</td>`;
      });
      bodyRows += `<td>${rowTotal > 0 ? formatMoney(rowTotal) : ""}</td>`;
      bodyRows += `<td>${escapeHtml(row.notes || "")}</td></tr>`;
    });

    let footRow = "<tr><th>TOTAL</th><td></td>";
    let wsGrand = 0;
    years.forEach((y) => {
      const t = ws.rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
      wsGrand += t;
      footRow += `<td>${formatMoney(t)}</td>`;
    });
    footRow += `<td>${formatMoney(wsGrand)}</td><td></td></tr>`;

    worksheetTablesHtml += `
      <h2>${escapeHtml(ws.label)}</h2>
      <table>
        <thead>${headerRow}</thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>${footRow}</tfoot>
      </table>
    `;
  });

  const notesHtml = state.globalNotes
    ? `<h2>Notes</h2><p style="white-space:pre-wrap">${escapeHtml(state.globalNotes)}</p>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(townName)} - Capital Improvement Program</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:1000px;margin:2em auto;padding:0 1em;color:#22271f;}
  table{border-collapse:collapse;width:100%;margin:1em 0;}
  td,th{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:0.88em;vertical-align:top;}
  thead th{background:#efece3;}
  tfoot th,tfoot td{font-weight:700;background:#f2f1ea;}
  h1{margin-bottom:4px;} h2{margin-top:2em;border-bottom:1px solid #ddd;padding-bottom:4px;}
  .meta{color:#666;font-size:0.9em;}
</style>
</head><body>
  <h1>${escapeHtml(townName)} - Capital Improvement Program</h1>
  <p class="meta">Prepared by: ${escapeHtml(state.metadata.preparedBy || "")}<br>
  Generated: ${escapeHtml(new Date().toLocaleDateString())}</p>
  ${worksheetTablesHtml}
  ${notesHtml}
</body></html>`;
}
