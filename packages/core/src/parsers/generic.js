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

/**
 * Parse generic CSV format with detailed error reporting per row
 * @param {string} csvString - CSV content
 * @param {string} source - Source identifier
 * @returns {{ transactions: Array, errors: Array, totalRows: number, validCount: number, errorCount: number }}
 */
export function parseWithErrors(csvString, source = "generic") {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      transactions: [],
      errors: [{ row: 0, message: "CSV file is empty or has no data rows" }],
      totalRows: 0,
      validCount: 0,
      errorCount: 1
    };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = indexMap(headers);

  // Flexible header mapping for common formats
  const dateKey = pickKey(idx, ["Date", "Transaction Date", "Posting Date"]);
  const descKey = pickKey(idx, ["Description", "Merchant", "Transaction Description"]);
  const amtKey = pickKey(idx, ["Amount", "Debit", "Charge", "Transaction Amount"]);

  const missingHeaders = [];
  if (!dateKey) missingHeaders.push("Date");
  if (!descKey) missingHeaders.push("Description");
  if (!amtKey) missingHeaders.push("Amount");

  if (missingHeaders.length > 0) {
    return {
      transactions: [],
      errors: [
        {
          row: 1,
          message: `Missing required headers: ${missingHeaders.join(", ")}. Found: ${headers.join(", ")}`
        }
      ],
      totalRows: lines.length - 1,
      validCount: 0,
      errorCount: 1
    };
  }

  const transactions = [];
  const errors = [];
  const totalRows = lines.length - 1;

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed, accounting for header
    const cols = splitCsvLine(lines[i]);

    const rawDate = cols[idx[dateKey]];
    const rawDesc = cols[idx[descKey]];
    const rawAmount = cols[idx[amtKey]];

    const date = normalizeDate(rawDate);
    const description = (rawDesc ?? "").trim();
    const amount = normalizeAmount(rawAmount);

    const rowErrors = [];

    if (!date) {
      rowErrors.push(`Invalid date "${rawDate ?? "(empty)"}"`);
    }
    if (!description) {
      rowErrors.push("Empty description");
    }
    if (Number.isNaN(amount)) {
      rowErrors.push(`Invalid amount "${rawAmount ?? "(empty)"}"`);
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNum,
        message: rowErrors.join("; "),
        value: { date: rawDate, description: rawDesc, amount: rawAmount }
      });
      continue;
    }

    transactions.push({
      date,
      description,
      amount,
      source,
      id: `${source}:${date}:${hash(description)}:${i}`
    });
  }

  return {
    transactions,
    errors,
    totalRows,
    validCount: transactions.length,
    errorCount: errors.length
  };
}
