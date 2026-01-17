import fs from "node:fs";
import { exportScheduleC as exportScheduleCCore } from "./exporter.js";

/**
 * Node.js-specific exporter utilities
 * This module contains fs-dependent functions for Node.js environments
 */

/**
 * Export transactions for Schedule C tax reporting (Node.js version with file writing)
 * @param {Array} categorizedTxns - Categorized transactions
 * @param {Object} options - Export options
 * @param {string} options.venture - Venture to filter by
 * @param {string|number} options.year - Year to filter by
 * @param {string} [options.outFile] - Output file path (optional)
 * @returns {{ csv: string, count: number }}
 */
export function exportScheduleC(categorizedTxns, { venture, year, outFile }) {
  const result = exportScheduleCCore(categorizedTxns, { venture, year });

  if (outFile) {
    fs.writeFileSync(outFile, result.csv, "utf8");
  }

  return result;
}
