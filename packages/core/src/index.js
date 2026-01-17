/**
 * Browser-safe exports
 * Use this in browser environments (web app)
 */

export { parseCsvString, validateAndParseCsv } from "./parser.js";
export { validateRulesFile, matchRule } from "./rules-engine.js";
export { categorizeTransactions } from "./categorizer.js";
export { exportScheduleC, generateAlerts, generateSummary, formatSummaryReport } from "./exporter.js";

// Schema exports for validation
export {
  TransactionSchema,
  ImportErrorSchema,
  CategoryRuleSchema,
  RulesFileSchema,
  CategorizedTransactionSchema,
  MonthlySummarySchema,
  ImportResultSchema,
  validateTransaction,
  validateRulesFile as validateRulesFileSchema,
  formatZodErrors
} from "./schemas.js";
