import fs from "node:fs";
import path from "node:path";
import {
  parseCsvFile,
  validateRulesFile,
  categorizeTransactions,
  exportScheduleC,
  generateAlerts
} from "../../../packages/core/src/index.js";

const [, , command, ...rest] = process.argv;

function getArg(flag) {
  const i = rest.indexOf(flag);
  if (i === -1) return null;
  return rest[i + 1] ?? null;
}

function ensureDataDir() {
  const p = path.resolve("data");
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

try {
  if (!command) {
    console.log("Usage: npm run <import|categorize|export|report> -- [args]");
    process.exit(0);
  }

  if (command === "import") {
    const file = getArg("--file");
    const source = getArg("--source") || "generic";
    if (!file) throw new Error("Missing --file");

    ensureDataDir();
    const txns = parseCsvFile(file, { source });
    writeJson("data/transactions.json", txns);

    console.log(`Imported ${txns.length} transactions → data/transactions.json`);
  }

  if (command === "categorize") {
    const rulesPath = getArg("--rules") || "rules/household.json";
    ensureDataDir();

    const txns = readJson("data/transactions.json");
    const rulesFile = readJson(rulesPath);
    validateRulesFile(rulesFile);

    const { categorized, alerts } = categorizeTransactions(txns, rulesFile);
    writeJson("data/categorized.json", categorized);
    writeJson("data/alerts.json", alerts);

    console.log(`Categorized ${categorized.length} transactions → data/categorized.json`);
    console.log(`Alerts: ${alerts.length} → data/alerts.json`);
  }

  if (command === "export") {
    const venture = getArg("--venture");
    const year = getArg("--year");
    const out = getArg("--out") || `data/export-${venture ?? "unknown"}-${year ?? "year"}.csv`;

    if (!venture) throw new Error("Missing --venture");
    if (!year) throw new Error("Missing --year");

    const categorized = readJson("data/categorized.json");
    const { count } = exportScheduleC(categorized, { venture, year, outFile: out });

    console.log(`Exported ${count} rows → ${out}`);
  }

  if (command === "report") {
    const type = getArg("--type") || "alerts";
    const categorized = readJson("data/categorized.json");

    if (type === "alerts") {
      const a = generateAlerts(categorized);
      console.log(JSON.stringify(a, null, 2));
    } else {
      throw new Error(`Unknown report type: ${type}`);
    }
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
