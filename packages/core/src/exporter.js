
/**
 * Export transactions for Schedule C tax reporting
 * @param {Array} categorizedTxns - Categorized transactions
 * @param {Object} options - Export options
 * @param {string} options.venture - Venture to filter by
 * @param {string|number} options.year - Year to filter by
 * @param {string} options.outFile - Output file path (optional)
 * @returns {Object} { csv, count }
 */
export function exportScheduleC(categorizedTxns, { venture, year }) {
  const y = String(year);
  const rows = categorizedTxns.filter((t) => {
    return t.venture === venture && t.date.startsWith(y);
  });

  const header = [
    "Date",
    "Description",
    "Amount",
    "Category",
    "Venture",
    "Note",
    "OriginalTxnId",
    "SplitPercent",
    "OriginalAmount"
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push([
      r.date,
      csvSafe(r.description),
      r.amount,
      csvSafe(r.category),
      csvSafe(r.venture),
      csvSafe(r.note ?? ""),
      csvSafe(r.originalTxnId ?? ""),
      r.allocation ? r.allocation.percent : "",
      r.allocation ? r.allocation.originalAmount : ""
    ].join(","));
  }

  const csv = lines.join("\n") + "\n";
  return { csv, count: rows.length };
}

/**
 * Generate alerts for uncategorized transactions and other issues
 * @param {Array} categorizedTxns - Categorized transactions
 * @returns {Object} Alert summary
 */
export function generateAlerts(categorizedTxns) {
  const uncategorized = categorizedTxns.filter((t) => t.category === "Uncategorized");
  return {
    uncategorizedCount: uncategorized.length,
    uncategorized
  };
}

/**
 * Generate summary report of transactions
 * @param {Array} categorizedTxns - Categorized transactions
 * @returns {Object} Summary with totals by venture and category
 */
export function generateSummary(categorizedTxns) {
  const byVenture = {};
  const byCategory = {};
  const byVentureCategory = {};
  let uncategorizedCount = 0;
  const uncategorizedMerchants = {};

  for (const txn of categorizedTxns) {
    const venture = txn.venture || "unassigned";
    const category = txn.category || "Uncategorized";
    const amount = txn.amount || 0;

    // Track totals by venture
    if (!byVenture[venture]) byVenture[venture] = 0;
    byVenture[venture] += amount;

    // Track totals by category
    if (!byCategory[category]) byCategory[category] = 0;
    byCategory[category] += amount;

    // Track totals by venture + category
    const key = `${venture}:${category}`;
    if (!byVentureCategory[key]) byVentureCategory[key] = 0;
    byVentureCategory[key] += amount;

    // Track uncategorized
    if (category === "Uncategorized") {
      uncategorizedCount++;
      const merchant = txn.description || "Unknown";
      if (!uncategorizedMerchants[merchant]) {
        uncategorizedMerchants[merchant] = { count: 0, total: 0 };
      }
      uncategorizedMerchants[merchant].count++;
      uncategorizedMerchants[merchant].total += amount;
    }
  }

  // Get top uncategorized merchants
  const topUncategorized = Object.entries(uncategorizedMerchants)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([merchant, data]) => ({
      merchant,
      count: data.count,
      total: data.total
    }));

  return {
    byVenture,
    byCategory,
    byVentureCategory,
    uncategorizedCount,
    topUncategorized,
    totalTransactions: categorizedTxns.length
  };
}

/**
 * Format summary report as human-readable text
 * @param {Object} summary - Summary object from generateSummary
 * @returns {string} Formatted report
 */
export function formatSummaryReport(summary) {
  const lines = [];

  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  TRANSACTION SUMMARY");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Total Transactions: ${summary.totalTransactions}`);
  lines.push(`Uncategorized: ${summary.uncategorizedCount}`);
  lines.push("");

  lines.push("───────────────────────────────────────────────────────");
  lines.push("  TOTALS BY VENTURE");
  lines.push("───────────────────────────────────────────────────────");
  const ventures = Object.entries(summary.byVenture).sort((a, b) => a[1] - b[1]);
  for (const [venture, total] of ventures) {
    lines.push(`  ${venture.padEnd(30)} ${formatAmount(total)}`);
  }
  lines.push("");

  lines.push("───────────────────────────────────────────────────────");
  lines.push("  TOTALS BY CATEGORY");
  lines.push("───────────────────────────────────────────────────────");
  const categories = Object.entries(summary.byCategory).sort((a, b) => a[1] - b[1]);
  for (const [category, total] of categories) {
    lines.push(`  ${category.padEnd(30)} ${formatAmount(total)}`);
  }
  lines.push("");

  if (summary.topUncategorized.length > 0) {
    lines.push("───────────────────────────────────────────────────────");
    lines.push("  TOP UNCATEGORIZED MERCHANTS");
    lines.push("───────────────────────────────────────────────────────");
    for (const { merchant, count, total } of summary.topUncategorized) {
      const truncated = merchant.length > 35 ? merchant.slice(0, 32) + "..." : merchant;
      lines.push(`  ${truncated.padEnd(35)} x${String(count).padStart(3)} ${formatAmount(total)}`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════");

  return lines.join("\n");
}

/**
 * Format amount with proper alignment and sign
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount
 */
function formatAmount(amount) {
  const abs = Math.abs(amount);
  const formatted = abs.toFixed(2);
  const sign = amount < 0 ? "-" : " ";
  return `${sign}$${formatted.padStart(12)}`;
}

/**
 * Escape and quote CSV values if needed
 * @param {*} s - Value to make CSV-safe
 * @returns {string} CSV-safe value
 */
function csvSafe(s) {
  const v = String(s ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
