#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  parseCsvFile,
  validateRulesFile,
  categorizeTransactions,
  exportScheduleC,
  generateAlerts,
  generateSummary,
  formatSummaryReport
} from "../../../packages/core/src/index-node.js";

const [, , command, ...rest] = process.argv;

/**
 * Get value of a command-line flag
 * @param {string} flag - Flag name (e.g., "--file")
 * @returns {string|null} Flag value or null
 */
function getArg(flag) {
  const i = rest.indexOf(flag);
  if (i === -1) return null;
  return rest[i + 1] ?? null;
}

/**
 * Check if a flag is present
 * @param {string} flag - Flag name
 * @returns {boolean} True if flag is present
 */
function hasFlag(flag) {
  return rest.includes(flag);
}

/**
 * Ensure output directory exists
 * @param {string} dir - Directory path
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read and parse JSON file with error handling
 * @param {string} p - File path
 * @returns {Object} Parsed JSON
 */
function readJson(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`File not found: ${p}\nMake sure to run the previous steps first.`);
  }

  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (err) {
    throw new Error(`Invalid JSON in ${p}: ${err.message}`);
  }
}

/**
 * Write object as JSON file
 * @param {string} p - File path
 * @param {Object} obj - Object to write
 */
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Family Office Tracker v0.2

USAGE:
  npm run <command> -- [options]

COMMANDS:
  import       Import CSV transactions from a bank or card statement
  plan         Preview categorization without writing files
  categorize   Categorize imported transactions using rules
  export       Export categorized transactions for a venture/year
  report       Generate summary reports

GLOBAL OPTIONS:
  --out-dir <dir>    Output directory (default: ./data)

IMPORT OPTIONS:
  --file <path>      CSV file to import (required)
  --source <type>    Source type: generic, chase, costco (default: generic)

CATEGORIZE OPTIONS:
  --rules <path>     Rules file (default: rules/household.json)
  --strict           Exit with error if uncategorized transactions exist

PLAN OPTIONS:
  --file <path>      CSV file to analyze (required)
  --source <type>    Source type: generic, chase, costco (default: generic)
  --rules <path>     Rules file (default: rules/household.json)

EXPORT OPTIONS:
  --venture <name>   Venture to export (required)
  --year <year>      Year to export (required)
  --out <path>       Output CSV file (optional)

REPORT OPTIONS:
  --type <type>      Report type: alerts, summary (default: summary)

EXAMPLES:
  npm run import -- --file bank.csv --source chase
  npm run plan -- --file bank.csv --rules rules/household.json
  npm run categorize -- --rules rules/household.json --strict
  npm run export -- --venture my-venture --year 2025
  npm run report -- --type summary
`);
}

try {
  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  // Get output directory (global option)
  const outDir = getArg("--out-dir") || "data";

  // IMPORT COMMAND
  if (command === "import") {
    const file = getArg("--file");
    const source = getArg("--source") || "generic";

    if (!file) {
      throw new Error(
        "Missing required argument: --file\n" +
        "Usage: npm run import -- --file <path> [--source <type>]\n" +
        "Example: npm run import -- --file bank.csv --source chase"
      );
    }

    ensureDir(outDir);
    const txns = parseCsvFile(file, { source });
    const outFile = path.join(outDir, "transactions.json");
    writeJson(outFile, txns);

    console.log(`✓ Imported ${txns.length} transactions → ${outFile}`);
  }

  // PLAN COMMAND
  else if (command === "plan") {
    const file = getArg("--file");
    const source = getArg("--source") || "generic";
    const rulesPath = getArg("--rules") || "rules/household.json";

    if (!file) {
      throw new Error(
        "Missing required argument: --file\n" +
        "Usage: npm run plan -- --file <path> [--source <type>] [--rules <path>]\n" +
        "Example: npm run plan -- --file bank.csv --source chase"
      );
    }

    // Parse transactions
    const txns = parseCsvFile(file, { source });
    console.log(`Parsed ${txns.length} transactions from ${file}\n`);

    // Load and validate rules
    const rulesFile = readJson(rulesPath);
    validateRulesFile(rulesFile);

    // Categorize (but don't write)
    const { categorized } = categorizeTransactions(txns, rulesFile);

    // Generate and display summary
    const summary = generateSummary(categorized);
    console.log(formatSummaryReport(summary));

    console.log("\nNo files were written. Run 'categorize' to save results.");
  }

  // CATEGORIZE COMMAND
  else if (command === "categorize") {
    const rulesPath = getArg("--rules") || "rules/household.json";
    const strict = hasFlag("--strict");

    ensureDir(outDir);

    const txnsFile = path.join(outDir, "transactions.json");
    const txns = readJson(txnsFile);

    const rulesFile = readJson(rulesPath);
    validateRulesFile(rulesFile);

    const { categorized, alerts } = categorizeTransactions(txns, rulesFile);

    const categorizedFile = path.join(outDir, "categorized.json");
    const alertsFile = path.join(outDir, "alerts.json");

    writeJson(categorizedFile, categorized);
    writeJson(alertsFile, alerts);

    console.log(`✓ Categorized ${categorized.length} transactions → ${categorizedFile}`);
    console.log(`✓ Alerts: ${alerts.length} → ${alertsFile}`);

    // Check for uncategorized in strict mode
    const uncategorized = categorized.filter((t) => t.category === "Uncategorized");
    if (strict && uncategorized.length > 0) {
      console.error(`\n✗ Error: ${uncategorized.length} uncategorized transactions in strict mode`);
      process.exit(1);
    }

    if (uncategorized.length > 0) {
      console.warn(`\n⚠ Warning: ${uncategorized.length} uncategorized transactions`);
      console.warn(`  Run: npm run report -- --type summary`);
    }
  }

  // EXPORT COMMAND
  else if (command === "export") {
    const venture = getArg("--venture");
    const year = getArg("--year");
    const out = getArg("--out");

    if (!venture) {
      throw new Error(
        "Missing required argument: --venture\n" +
        "Usage: npm run export -- --venture <name> --year <year> [--out <file>]\n" +
        "Example: npm run export -- --venture my-venture --year 2025"
      );
    }

    if (!year) {
      throw new Error(
        "Missing required argument: --year\n" +
        "Usage: npm run export -- --venture <name> --year <year> [--out <file>]\n" +
        "Example: npm run export -- --venture my-venture --year 2025"
      );
    }

    const categorizedFile = path.join(outDir, "categorized.json");
    const categorized = readJson(categorizedFile);

    const outFile = out || path.join(outDir, `export-${venture}-${year}.csv`);
    const { count } = exportScheduleC(categorized, { venture, year, outFile });

    console.log(`✓ Exported ${count} transactions → ${outFile}`);
  }

  // REPORT COMMAND
  else if (command === "report") {
    const type = getArg("--type") || "summary";
    const categorizedFile = path.join(outDir, "categorized.json");
    const categorized = readJson(categorizedFile);

    if (type === "alerts") {
      const alerts = generateAlerts(categorized);
      console.log(JSON.stringify(alerts, null, 2));
    } else if (type === "summary") {
      const summary = generateSummary(categorized);
      console.log(formatSummaryReport(summary));
    } else {
      throw new Error(
        `Unknown report type: "${type}"\n` +
        `Available types: alerts, summary`
      );
    }
  }

  // UNKNOWN COMMAND
  else {
    throw new Error(
      `Unknown command: "${command}"\n` +
      `Run "npm run help" to see available commands.`
    );
  }
} catch (err) {
  console.error(`\n✗ Error: ${err.message}\n`);
  process.exit(1);
}
