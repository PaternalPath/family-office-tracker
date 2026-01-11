/**
 * Generic CSV parser adapter
 * Handles common CSV formats with flexible header matching
 *
 * Supported headers:
 * - Date: "Date", "Transaction Date", "Posting Date"
 * - Description: "Description", "Merchant", "Transaction Description"
 * - Amount: "Amount", "Debit", "Charge", "Transaction Amount"
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
 * Parse generic CSV format
 * @param {string} csvString - CSV content
 * @param {string} source - Source identifier
 * @returns {Array} Array of normalized transactions
 */
export function parse(csvString, source = "generic") {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = indexMap(headers);

  // Flexible header mapping for common formats
  const dateKey = pickKey(idx, ["Date", "Transaction Date", "Posting Date"]);
  const descKey = pickKey(idx, ["Description", "Merchant", "Transaction Description"]);
  const amtKey = pickKey(idx, ["Amount", "Debit", "Charge", "Transaction Amount"]);

  if (!dateKey || !descKey || !amtKey) {
    throw new Error(
      `CSV missing required headers. Found: ${headers.join(", ")}`
    );
  }

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const date = normalizeDate(cols[idx[dateKey]]);
    const description = (cols[idx[descKey]] ?? "").trim();
    const amount = normalizeAmount(cols[idx[amtKey]]);

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
