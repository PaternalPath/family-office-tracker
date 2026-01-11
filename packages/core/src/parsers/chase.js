/**
 * Chase Credit Card CSV parser adapter
 * Handles Chase credit card export format
 *
 * Supported headers (Chase format):
 * - Transaction Date
 * - Post Date
 * - Description
 * - Category (Chase's category - we ignore this)
 * - Type (Sale/Return/Payment)
 * - Amount
 * - Memo (optional)
 */

import {
  splitCsvLine,
  indexMap,
  pickKey,
  normalizeDate,
  normalizeAmount,
  hash
} from "./_shared.js";

/**
 * Parse Chase CSV format
 * @param {string} csvString - CSV content
 * @param {string} source - Source identifier
 * @returns {Array} Array of normalized transactions
 */
export function parse(csvString, source = "chase") {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = indexMap(headers);

  // Chase-specific header mapping
  const dateKey = pickKey(idx, ["Transaction Date", "Post Date", "Date"]);
  const descKey = pickKey(idx, ["Description"]);
  const amtKey = pickKey(idx, ["Amount"]);
  const typeKey = pickKey(idx, ["Type"]);
  const memoKey = pickKey(idx, ["Memo"]);

  if (!dateKey || !descKey || !amtKey) {
    throw new Error(
      `Chase CSV missing required headers. Found: ${headers.join(", ")}\n` +
      `Expected: Transaction Date, Description, Amount`
    );
  }

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const date = normalizeDate(cols[idx[dateKey]]);
    let description = (cols[idx[descKey]] ?? "").trim();
    let amount = normalizeAmount(cols[idx[amtKey]]);

    // Add memo to description if available
    if (memoKey && cols[idx[memoKey]]) {
      const memo = cols[idx[memoKey]].trim();
      if (memo) description += ` [${memo}]`;
    }

    // Chase exports charges as negative for credit cards
    // Ensure consistent negative values for charges
    const type = typeKey ? (cols[idx[typeKey]] ?? "").trim() : "";
    if (type === "Return" || type === "Payment") {
      amount = Math.abs(amount);
    } else if (type === "Sale") {
      amount = -Math.abs(amount);
    }

    if (!date || !description || Number.isNaN(amount)) continue;

    out.push({
      date,
      description,
      amount,
      source,
      id: `${source}:${date}:${hash(description)}:${i}`
    });
  }
  return out;
}
