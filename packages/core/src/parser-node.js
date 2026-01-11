import fs from "node:fs";
import { parseCsvString } from "./parser.js";

/**
 * Node.js-specific parser utilities
 * This module contains fs-dependent functions for Node.js environments
 */

/**
 * Parse a CSV file into normalized transactions
 * Routes to the appropriate parser based on source
 *
 * @param {string} filePath - Path to CSV file
 * @param {Object} options - Parser options
 * @param {string} options.source - Source type (generic, chase, costco)
 * @returns {Array} Array of normalized transactions
 */
export function parseCsvFile(filePath, { source = "generic" } = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return parseCsvString(raw, { source });
}
