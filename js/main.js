// Entry point - state management, tab routing, persistence.

import {
  DEFAULT_START_YEAR, DEFAULT_NUM_YEARS, DEFAULT_BUDGET,
  WORKSHEET_DEFS, WORKSHEET_ORDER,
} from "./data.js";
import { nonNegative } from "./helpers.js";
import { renderBudgetScreen } from "./budget.js";
import { renderWorksheet } from "./worksheets.js";
import { renderSummary } from "./summary.js";
import { serializeSession, parseSessionCsv, downloadFile } from "./csv.js";
import { buildExportHtml } from "./print.js";
import "./modal.js";

const STORAGE_KEY = "vermont-cip-v1";

// ---- State initialization ----

function buildDefaultBudgetYears(startYear, numYears) {
  const list = [];
  for (let i = 0; i < numYears; i++) {
    list.push({
      year: "FY" + (startYear + i),
      local: DEFAULT_BUDGET.annualLocal,
      grant: DEFAULT_BUDGET.annualGrantAvg,
      debt: DEFAULT_BUDGET.annualDebtService,
    });
  }
  return list;
}

function buildDefaultWorksheets(years) {
  const worksheets = {};
  WORKSHEET_ORDER.forEach((wsId) => {
    const def = WORKSHEET_DEFS[wsId];
    worksheets[wsId] = {
      label: def.label,
      rows: def.rows.map((r) => {
        const values = {};
        years.forEach((y) => { values[y] = 0; });
        return {
          id: r.id,
          label: r.label,
          type: r.type,
          customName: "",
          values,
          notes: "",
        };
      }),
    };
  });
  return worksheets;
}

function defaultState() {
  const budgetYears = buildDefaultBudgetYears(DEFAULT_START_YEAR, DEFAULT_NUM_YEARS);
  const yearKeys = budgetYears.map((b) => b.year);
  return {
    activeTab: "budget",
    startYear: DEFAULT_START_YEAR,
    numYears: DEFAULT_NUM_YEARS,
    budgetYears,
    worksheets: buildDefaultWorksheets(yearKeys),
    globalNotes: "",
    metadata: { townName: "", preparedBy: "", dateAdopted: "" },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const loaded = JSON.parse(raw);
    const base = defaultState();
    // Merge loaded state onto defaults so new fields get populated
    const merged = Object.assign(base, loaded);
    // Ensure every worksheet has all expected rows with correct year keys
    const yearKeys = merged.budgetYears.map((b) => b.year);
    WORKSHEET_ORDER.forEach((wsId) => {
      if (!merged.worksheets[wsId]) {
        const def = WORKSHEET_DEFS[wsId];
        merged.worksheets[wsId] = {
          label: def.label,
          rows: def.rows.map((r) => {
            const values = {};
            yearKeys.forEach((y) => { values[y] = 0; });
            return { id: r.id, label: r.label, type: r.type, customName: "", values, notes: "" };
          }),
        };
      } else {
        // Ensure year keys exist on every row
        merged.worksheets[wsId].rows.forEach((row) => {
          yearKeys.forEach((y) => {
            if (row.values[y] === undefined) row.values[y] = 0;
          });
        });
      }
    });
    merged.budgetYears.forEach((by) => { by.debt = nonNegative(by.debt); });
    return merged;
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* quota exceeded or private mode */ }
}

let state = loadState();

function onChanged() {
  saveState();
}

// ---- Year management ----

function regenerateBudgetYears(newStart, newNum) {
  const existingByYear = {};
  state.budgetYears.forEach((by) => { existingByYear[by.year] = by; });
  const list = [];
  for (let i = 0; i < newNum; i++) {
    const y = "FY" + (newStart + i);
    list.push(existingByYear[y] || {
      year: y,
      local: DEFAULT_BUDGET.annualLocal,
      grant: DEFAULT_BUDGET.annualGrantAvg,
      debt: DEFAULT_BUDGET.annualDebtService,
    });
  }
  state.startYear = newStart;
  state.numYears = newNum;
  state.budgetYears = list;

  // Ensure worksheet rows have values for all year keys
  const yearKeys = list.map((b) => b.year);
  Object.values(state.worksheets).forEach((ws) => {
    ws.rows.forEach((row) => {
      yearKeys.forEach((y) => {
        if (row.values[y] === undefined) row.values[y] = 0;
      });
    });
  });

  saveState();
}

// ---- Tab navigation ----

function activateTab(tabId) {
  state.activeTab = tabId;
  saveState();

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === "tab-" + tabId);
  });

  // Set worksheet tab label
  const wsLabel = document.getElementById("worksheet-label");
  if (WORKSHEET_DEFS[tabId]) {
    wsLabel.textContent = WORKSHEET_DEFS[tabId].label;
    renderWorksheet(state, tabId, onChanged);
    document.getElementById("tab-worksheet").classList.add("active");
    document.querySelectorAll(".tab-pane").forEach((p) => {
      if (p.id !== "tab-worksheet" && p.id !== "tab-" + tabId) p.classList.remove("active");
    });
  } else if (tabId === "summary") {
    renderSummary(state);
  } else if (tabId === "budget") {
    renderBudgetScreen(state, onChanged);
  }
}

document.getElementById("tab-bar").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (btn) activateTab(btn.dataset.tab);
});

// ---- Budget screen events ----

document.getElementById("start-year-input").addEventListener("change", (e) => {
  const val = Math.round(Number(e.target.value));
  if (!Number.isFinite(val)) return;
  regenerateBudgetYears(val, state.numYears);
  renderBudgetScreen(state, onChanged);
});

document.getElementById("num-years-input").addEventListener("change", (e) => {
  let val = Math.round(Number(e.target.value));
  if (!Number.isFinite(val) || val < 1) val = 1;
  if (val > 10) val = 10;
  regenerateBudgetYears(state.startYear, val);
  renderBudgetScreen(state, onChanged);
});

document.getElementById("town-name-input").addEventListener("input", (e) => {
  state.metadata.townName = e.target.value;
  saveState();
});

document.getElementById("prepared-by-input").addEventListener("input", (e) => {
  state.metadata.preparedBy = e.target.value;
  saveState();
});

// ---- CSV import ----

document.getElementById("csv-file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const statusEl = document.getElementById("csv-import-status");
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const result = parseSessionCsv(String(reader.result));
      applyImport(result);
      statusEl.textContent = "Imported: " + result.summary + ".";
    } catch (err) {
      statusEl.textContent = "Import failed: " + err.message;
    }
  };
  reader.onerror = () => { statusEl.textContent = "Could not read that file."; };
  reader.readAsText(file);
  e.target.value = "";
});

/** Merge imported CSV data into current state. Budget years replace entirely
 *  if present; cells and row metadata are applied onto existing worksheet rows. */
function applyImport(result) {
  if (result.budgetYears.length) {
    state.budgetYears = result.budgetYears;
    const firstYearNum = parseInt(String(result.budgetYears[0].year).replace(/\D/g, ""), 10);
    state.startYear = Number.isFinite(firstYearNum) ? firstYearNum : state.startYear;
    state.numYears = result.budgetYears.length;
  }
  if (result.metadata.startYear) {
    state.startYear = Number(result.metadata.startYear) || state.startYear;
  }
  if (result.metadata.numYears) {
    state.numYears = Number(result.metadata.numYears) || state.numYears;
  }
  if (result.metadata.townName) state.metadata.townName = result.metadata.townName;
  if (result.metadata.preparedBy) state.metadata.preparedBy = result.metadata.preparedBy;

  // Apply cell values
  const yearKeys = state.budgetYears.map((b) => b.year);
  result.cells.forEach((cell) => {
    const ws = state.worksheets[cell.worksheet];
    if (!ws) return;
    const row = ws.rows.find((r) => r.id === cell.rowId);
    if (!row) return;
    if (yearKeys.includes(cell.year)) {
      row.values[cell.year] = cell.amount;
    }
  });

  // Apply row metadata (custom names, notes)
  result.rowMeta.forEach((rm) => {
    const ws = state.worksheets[rm.worksheet];
    if (!ws) return;
    const row = ws.rows.find((r) => r.id === rm.rowId);
    if (!row) return;
    if (rm.customName) row.customName = rm.customName;
    if (rm.notes) row.notes = rm.notes;
  });

  if (result.globalNotes !== null) state.globalNotes = result.globalNotes;

  saveState();
  activateTab(state.activeTab);
}

// ---- Export ----

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

document.getElementById("btn-export-csv").addEventListener("click", () => {
  const name = state.metadata.townName || "cip";
  downloadFile(`${name}-cip-${todayStamp()}.csv`, serializeSession(state), "text/csv");
});

document.getElementById("btn-export-doc").addEventListener("click", () => {
  const name = state.metadata.townName || "cip";
  downloadFile(`${name}-cip-${todayStamp()}.html`, buildExportHtml(state), "text/html");
});

document.getElementById("btn-print").addEventListener("click", () => window.print());

// ---- Global notes ----

document.getElementById("global-notes").addEventListener("input", (e) => {
  state.globalNotes = e.target.value;
  saveState();
});

// ---- Reset ----

document.getElementById("btn-restart").addEventListener("click", () => {
  if (!window.confirm("Start a new plan? This clears all data.")) return;
  state = defaultState();
  saveState();
  activateTab("budget");
});

// ---- Init ----

// Populate global notes field
document.getElementById("global-notes").value = state.globalNotes || "";

activateTab(state.activeTab);
