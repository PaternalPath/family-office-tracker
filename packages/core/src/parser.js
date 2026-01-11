import * as genericParser from "./parsers/generic.js";
import * as chaseParser from "./parsers/chase.js";
import * as costcoParser from "./parsers/costco.js";

/**
 * Parser adapter registry
 * Maps source identifiers to their respective parser modules
 */
const PARSERS = {
  generic: genericParser,
  chase: chaseParser,
  costco: costcoParser
};

/**
 * Parse CSV string into normalized transactions
 * Routes to the appropriate parser based on source
 *
 * @param {string} csvString - CSV content
 * @param {Object} options - Parser options
 * @param {string} options.source - Source type (generic, chase, costco)
 * @returns {Array} Array of normalized transactions
 *
 * Each transaction has the structure:
 * {
 *   date: string (YYYY-MM-DD),
 *   description: string,
 *   amount: number (negative for charges, positive for credits),
 *   source: string,
 *   id: string (deterministic unique identifier)
 * }
 */
export function parseCsvString(csvString, { source = "generic" } = {}) {
  const parser = PARSERS[source];

  if (!parser) {
    const available = Object.keys(PARSERS).join(", ");
    throw new Error(
      `Unknown source: "${source}". Available sources: ${available}`
    );
  }

  try {
    return parser.parse(csvString, source);
  } catch (err) {
    throw new Error(`Failed to parse ${source} CSV: ${err.message}`);
  }
}
