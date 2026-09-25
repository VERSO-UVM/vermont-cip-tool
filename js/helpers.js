// Shared utility functions used across all modules. These are pure
// functions with no DOM or state dependencies (except escapeHtml, which
// uses a throwaway DOM element for safe HTML encoding).

/** Format a number as US dollars with no cents: "$1,234,567". */
export function formatMoney(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** Coerce a value to a non-negative number; returns 0 for NaN, negative, or Infinity. */
export function nonNegative(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Escape a string for safe insertion into HTML text content. */
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str === null || str === undefined ? "" : String(str);
  return div.innerHTML;
}

/** Escape a string for safe insertion into an HTML attribute (double-quoted). */
export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

/** Generate a short random alphanumeric ID (not cryptographic). */
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
