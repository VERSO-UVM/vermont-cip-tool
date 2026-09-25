// Editable worksheet grid rendering.

import { formatMoney, nonNegative, escapeHtml, escapeAttr } from "./helpers.js";
import { WORKSHEET_DEFS } from "./data.js";
import { availableLocal } from "./budget.js";

export function renderWorksheet(state, wsId, onChanged) {
  const ws = state.worksheets[wsId];
  if (!ws) return;
  const years = state.budgetYears.map((b) => b.year);
  const container = document.getElementById("worksheet-grid");

  buildTable(container, ws, years, state, wsId);
  bindInputs(container, ws, years, state, wsId, onChanged);
}

function buildTable(container, ws, years, state, wsId) {
  // Header
  let headerHtml = '<tr><th class="row-label-col">Project</th><th class="row-label-col name-col">Name / Description</th>';
  years.forEach((y) => { headerHtml += `<th>${escapeHtml(y)}</th>`; });
  headerHtml += '<th>Total</th><th class="notes-col">Notes</th></tr>';

  // Body rows
  let bodyHtml = "";
  ws.rows.forEach((row) => {
    const rowTotal = years.reduce((sum, y) => sum + nonNegative(row.values[y]), 0);
    bodyHtml += `<tr data-row="${escapeAttr(row.id)}">`;
    bodyHtml += `<td class="row-label-col">${escapeHtml(row.label)}</td>`;

    if (row.type === "named" || row.type === "other") {
      bodyHtml += `<td><input type="text" class="name-input" data-row="${escapeAttr(row.id)}" data-field="customName" value="${escapeAttr(row.customName || "")}" placeholder="Enter name..." /></td>`;
    } else {
      bodyHtml += "<td></td>";
    }

    years.forEach((y) => {
      const val = row.values[y] || 0;
      bodyHtml += `<td><input type="number" class="cell-input" data-row="${escapeAttr(row.id)}" data-year="${escapeAttr(y)}" min="0" step="1000" value="${val || ""}" aria-label="${escapeAttr(row.label)} ${escapeAttr(y)}" /></td>`;
    });

    bodyHtml += `<td class="row-total">${rowTotal > 0 ? formatMoney(rowTotal) : ""}</td>`;
    bodyHtml += `<td><input type="text" class="notes-input" data-row="${escapeAttr(row.id)}" data-field="notes" value="${escapeAttr(row.notes || "")}" placeholder="" /></td>`;
    bodyHtml += "</tr>";
  });

  // Footer - column totals
  const footHtml = buildFooter(ws, years, state);

  container.innerHTML = `
    <table class="worksheet-table">
      <thead>${headerHtml}</thead>
      <tbody>${bodyHtml}</tbody>
      <tfoot id="ws-foot">${footHtml}</tfoot>
    </table>
  `;
}

function buildFooter(ws, years, state) {
  let html = '<tr class="total-row"><th>TOTAL</th><td></td>';
  let grandTotal = 0;
  years.forEach((y) => {
    const colTotal = ws.rows.reduce((sum, row) => sum + nonNegative(row.values[y]), 0);
    grandTotal += colTotal;
    const cls = budgetClassForYear(state, y);
    html += `<td class="year-total ${cls}">${formatMoney(colTotal)}</td>`;
  });
  html += `<td class="row-total">${formatMoney(grandTotal)}</td><td></td></tr>`;
  return html;
}

function bindInputs(container, ws, years, state, wsId, onChanged) {
  container.querySelectorAll(".cell-input").forEach((input) => {
    input.addEventListener("input", () => {
      const rowId = input.dataset.row;
      const year = input.dataset.year;
      const row = ws.rows.find((r) => r.id === rowId);
      if (row) {
        row.values[year] = nonNegative(input.value);
        onChanged();
        refreshTotals(container, ws, years, state);
      }
    });
  });

  container.querySelectorAll(".name-input, .notes-input").forEach((input) => {
    input.addEventListener("input", () => {
      const rowId = input.dataset.row;
      const field = input.dataset.field;
      const row = ws.rows.find((r) => r.id === rowId);
      if (row) {
        row[field] = input.value;
        onChanged();
      }
    });
  });
}

function refreshTotals(container, ws, years, state) {
  // Update each row's horizontal total
  ws.rows.forEach((row) => {
    const rowTotal = years.reduce((sum, y) => sum + nonNegative(row.values[y]), 0);
    const tr = container.querySelector(`tr[data-row="${CSS.escape(row.id)}"]`);
    if (tr) {
      const td = tr.querySelector(".row-total");
      if (td) td.textContent = rowTotal > 0 ? formatMoney(rowTotal) : "";
    }
  });

  // Rebuild the entire footer to avoid index mismatch issues
  const foot = container.querySelector("#ws-foot");
  if (foot) {
    foot.innerHTML = buildFooter(ws, years, state);
  }
}

// Budget status for a year across ALL worksheets.
function budgetClassForYear(state, year) {
  const by = state.budgetYears.find((b) => b.year === year);
  if (!by) return "ok";
  const available = availableLocal(by);
  let total = 0;
  Object.values(state.worksheets).forEach((ws) => {
    total += ws.rows.reduce((sum, row) => sum + nonNegative(row.values[year]), 0);
  });
  if (total > available + by.grant) return "over";
  if (total > available) return "warn";
  return "ok";
}
