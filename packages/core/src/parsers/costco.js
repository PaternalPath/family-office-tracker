/**
 * Costco Anywhere Visa (Citi) CSV parser adapter
 * Handles Costco Citi credit card export format
 *
 * Supported headers (Costco Citi format):
 * - Status (often "Cleared")
 * - Date
 * - Description
 * - Debit
 * - Credit
 * - Member (optional - cardholder name)
 *
 * Note: Costco uses separate Debit/Credit columns instead of a single Amount
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
 * Parse Costco Citi CSV format
 * @param {string} csvString - CSV content
 * @param {string} source - Source identifier
 * @returns {Array} Array of normalized transactions
 */
export function parse(csvString, source = "costco") {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = indexMap(headers);

  // Costco-specific header mapping
  const dateKey = pickKey(idx, ["Date", "Transaction Date", "Posted Date"]);
  const descKey = pickKey(idx, ["Description", "Merchant"]);
  const debitKey = pickKey(idx, ["Debit"]);
  const creditKey = pickKey(idx, ["Credit"]);
  const statusKey = pickKey(idx, ["Status"]);

  if (!dateKey || !descKey) {
    throw new Error(
      `Costco CSV missing required headers. Found: ${headers.join(", ")}\n` +
      `Expected: Date, Description, and either Debit/Credit or Amount`
    );
  }

  // Check if we have Debit/Credit columns OR a single Amount column
  const hasDebitCredit = debitKey || creditKey;
  const amtKey = hasDebitCredit ? null : pickKey(idx, ["Amount"]);

  if (!hasDebitCredit && !amtKey) {
    throw new Error(
      `Costco CSV must have either Debit/Credit columns or Amount column`
    );
  }

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const date = normalizeDate(cols[idx[dateKey]]);
    const description = (cols[idx[descKey]] ?? "").trim();

    // Calculate amount from Debit/Credit or Amount column
    let amount;
    if (hasDebitCredit) {
      const debit = debitKey ? normalizeAmount(cols[idx[debitKey]]) : 0;
      const credit = creditKey ? normalizeAmount(cols[idx[creditKey]]) : 0;

      // Debits are negative (charges), Credits are positive (returns/payments)
      amount = (credit || 0) - (debit || 0);
    } else {
      amount = normalizeAmount(cols[idx[amtKey]]);
    }

    // Skip pending transactions if status column exists
    if (statusKey) {
      const status = (cols[idx[statusKey]] ?? "").trim().toLowerCase();
      if (status === "pending") continue;
    }

    if (!date || !description || Number.isNaN(amount) || amount === 0) continue;

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
