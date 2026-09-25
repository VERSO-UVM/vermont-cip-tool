// Summary tab - auto-calculated roll-up across all worksheets.

import { formatMoney, nonNegative, escapeHtml } from "./helpers.js";
import { WORKSHEET_ORDER } from "./data.js";
import { availableLocal } from "./budget.js";

export function renderSummary(state) {
  const container = document.getElementById("summary-content");
  const years = state.budgetYears.map((b) => b.year);

  let headerHtml = "<tr><th>Category</th>";
  years.forEach((y) => { headerHtml += `<th>${escapeHtml(y)}</th>`; });
  headerHtml += "<th>Total</th></tr>";

  let bodyHtml = "";
  let grandByYear = {};
  years.forEach((y) => { grandByYear[y] = 0; });
  let grandTotal = 0;

  WORKSHEET_ORDER.forEach((wsId) => {
    const ws = state.worksheets[wsId];
    if (!ws) return;
    let wsTotal = 0;
    bodyHtml += `<tr><th>${escapeHtml(ws.label)}</th>`;
    years.forEach((y) => {
      const colTotal = ws.rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
      grandByYear[y] += colTotal;
      wsTotal += colTotal;
      bodyHtml += `<td>${colTotal > 0 ? formatMoney(colTotal) : "-"}</td>`;
    });
    grandTotal += wsTotal;
    bodyHtml += `<td class="row-total">${wsTotal > 0 ? formatMoney(wsTotal) : "-"}</td></tr>`;
  });

  // Grand total row
  let footHtml = "<tr class=\"total-row\"><th>GRAND TOTAL</th>";
  years.forEach((y) => {
    const by = state.budgetYears.find((b) => b.year === y);
    const available = by ? availableLocal(by) : 0;
    const grant = by ? by.grant : 0;
    let cls = "ok";
    if (grandByYear[y] > available + grant) cls = "over";
    else if (grandByYear[y] > available) cls = "warn";
    footHtml += `<td class="year-total ${cls}">${formatMoney(grandByYear[y])}</td>`;
  });
  footHtml += `<td class="row-total">${formatMoney(grandTotal)}</td></tr>`;

  // Budget capacity row
  let capacityHtml = '<tr class="capacity-row"><th>Available local funds</th>';
  years.forEach((y) => {
    const by = state.budgetYears.find((b) => b.year === y);
    capacityHtml += `<td>${by ? formatMoney(availableLocal(by)) : "-"}</td>`;
  });
  const totalAvailable = state.budgetYears.reduce((sum, by) => sum + availableLocal(by), 0);
  capacityHtml += `<td>${formatMoney(totalAvailable)}</td></tr>`;

  let grantHtml = '<tr class="capacity-row"><th>+ Grant estimates</th>';
  years.forEach((y) => {
    const by = state.budgetYears.find((b) => b.year === y);
    grantHtml += `<td>${by ? formatMoney(by.grant) : "-"}</td>`;
  });
  const totalGrants = state.budgetYears.reduce((sum, by) => sum + nonNegative(by.grant), 0);
  grantHtml += `<td>${formatMoney(totalGrants)}</td></tr>`;

  let remainingHtml = '<tr class="remaining-row"><th>Remaining capacity</th>';
  years.forEach((y) => {
    const by = state.budgetYears.find((b) => b.year === y);
    const capacity = by ? availableLocal(by) + nonNegative(by.grant) : 0;
    const remaining = capacity - grandByYear[y];
    const cls = remaining < 0 ? "over" : "ok";
    remainingHtml += `<td class="${cls}">${formatMoney(remaining)}</td>`;
  });
  const totalRemaining = (totalAvailable + totalGrants) - grandTotal;
  const totalCls = totalRemaining < 0 ? "over" : "ok";
  remainingHtml += `<td class="${totalCls}">${formatMoney(totalRemaining)}</td></tr>`;

  container.innerHTML = `
    <table class="summary-table">
      <thead>${headerHtml}</thead>
      <tbody>${bodyHtml}</tbody>
      <tfoot>
        ${footHtml}
        ${capacityHtml}
        ${grantHtml}
        ${remainingHtml}
      </tfoot>
    </table>
  `;
}
