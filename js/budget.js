// Budget setup screen - year configuration and funding sources.

import { formatMoney, nonNegative, escapeHtml } from "./helpers.js";

export function renderBudgetScreen(state, onChanged) {
  document.getElementById("town-name-input").value = state.metadata.townName;
  document.getElementById("prepared-by-input").value = state.metadata.preparedBy;
  document.getElementById("start-year-input").value = state.startYear;
  document.getElementById("num-years-input").value = state.numYears;
  renderBudgetYearsTable(state, onChanged);
}

function renderBudgetYearsTable(state, onChanged) {
  const body = document.getElementById("budget-years-body");
  body.innerHTML = "";
  state.budgetYears.forEach((by, idx) => {
    const tr = document.createElement("tr");

    const yearTd = document.createElement("td");
    yearTd.textContent = by.year;

    const localTd = document.createElement("td");
    const localInput = document.createElement("input");
    localInput.type = "number";
    localInput.min = "0";
    localInput.step = "1000";
    localInput.value = by.local;
    localInput.setAttribute("aria-label", by.year + " local funds");
    localInput.addEventListener("input", () => {
      state.budgetYears[idx].local = nonNegative(localInput.value);
      onChanged();
      updateAvailableCells(state);
    });
    localTd.appendChild(localInput);

    const grantTd = document.createElement("td");
    const grantInput = document.createElement("input");
    grantInput.type = "number";
    grantInput.min = "0";
    grantInput.step = "1000";
    grantInput.value = by.grant;
    grantInput.setAttribute("aria-label", by.year + " grant estimate");
    grantInput.addEventListener("input", () => {
      state.budgetYears[idx].grant = nonNegative(grantInput.value);
      onChanged();
    });
    grantTd.appendChild(grantInput);

    const debtTd = document.createElement("td");
    const debtInput = document.createElement("input");
    debtInput.type = "number";
    debtInput.min = "0";
    debtInput.step = "1000";
    debtInput.value = nonNegative(by.debt);
    debtInput.setAttribute("aria-label", by.year + " existing debt service");
    debtInput.addEventListener("input", () => {
      state.budgetYears[idx].debt = nonNegative(debtInput.value);
      onChanged();
      updateAvailableCells(state);
    });
    debtTd.appendChild(debtInput);

    const availableTd = document.createElement("td");
    availableTd.className = "available-cell";
    availableTd.dataset.availableFor = by.year;
    availableTd.textContent = formatMoney(availableLocal(by));

    tr.appendChild(yearTd);
    tr.appendChild(localTd);
    tr.appendChild(grantTd);
    tr.appendChild(debtTd);
    tr.appendChild(availableTd);
    body.appendChild(tr);
  });
}

function updateAvailableCells(state) {
  document.querySelectorAll("[data-available-for]").forEach((td) => {
    const by = state.budgetYears.find((b) => b.year === td.dataset.availableFor);
    if (by) td.textContent = formatMoney(availableLocal(by));
  });
}

/**
 * What the plan can actually spend: local funds minus existing debt service,
 * floored at 0 so a year whose debt exceeds its local funds doesn't go negative.
 */
export function availableLocal(by) {
  return Math.max(0, nonNegative(by.local) - nonNegative(by.debt));
}
