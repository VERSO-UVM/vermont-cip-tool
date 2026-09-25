// Shared utility functions.

export function formatMoney(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function nonNegative(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str === null || str === undefined ? "" : String(str);
  return div.innerHTML;
}

export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
