import * as genericParser from "./parsers/generic.js";
import * as chaseParser from "./parsers/chase.js";
import * as costcoParser from "./parsers/costco.js";
import { TransactionSchema, formatZodErrors } from "./schemas.js";

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
 * @param {Object} [options] - Parser options
 * @param {string} [options.source='generic'] - Source type (generic, chase, costco)
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

/**
 * @typedef {import('./schemas.js').ImportError} ImportError
 */

/**
 * Parse and validate CSV string with detailed row-level error reporting
 * Unlike parseCsvString, this never throws - it returns both valid data and errors
 *
 * @param {string} csvString - CSV content
 * @param {Object} [options] - Parser options
 * @param {string} [options.source='generic'] - Source type (generic, chase, costco)
 * @returns {{ transactions: Array, errors: ImportError[], totalRows: number, validCount: number, errorCount: number }}
 */
export function validateAndParseCsv(csvString, { source = "generic" } = {}) {
  const parser = PARSERS[source];

  if (!parser) {
    const available = Object.keys(PARSERS).join(", ");
    return {
      transactions: [],
      errors: [
        {
          row: 0,
          message: `Unknown source: "${source}". Available sources: ${available}`
        }
      ],
      totalRows: 0,
      validCount: 0,
      errorCount: 1
    };
  }

  try {
    // Use the parser's parseWithErrors if available, otherwise wrap the standard parse
    if (parser.parseWithErrors) {
      return parser.parseWithErrors(csvString, source);
    }

    // Fallback: run standard parse and validate each transaction
    const rawTransactions = parser.parse(csvString, source);
    const transactions = [];
    const errors = [];

    rawTransactions.forEach((txn, index) => {
      const result = TransactionSchema.safeParse(txn);
      if (result.success) {
        transactions.push(result.data);
      } else {
        errors.push({
          row: index + 2, // +2 because: 1-indexed + header row
          message: formatZodErrors(result.error).join("; "),
          value: txn
        });
      }
    });

    return {
      transactions,
      errors,
      totalRows: rawTransactions.length,
      validCount: transactions.length,
      errorCount: errors.length
    };
  } catch (err) {
    return {
      transactions: [],
      errors: [
        {
          row: 0,
          message: `Failed to parse ${source} CSV: ${err.message}`
        }
      ],
      totalRows: 0,
      validCount: 0,
      errorCount: 1
    };
  }
}
