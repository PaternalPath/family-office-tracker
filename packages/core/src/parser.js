import fs from "node:fs";

/**
 * Parse a CSV into normalized transactions:
 * { date: "YYYY-MM-DD", description: string, amount: number, source: string, id: string }
 */
export function parseCsvFile(filePath, { source = "generic" } = {}) {
  const raw = fs.readFileSync(filePath, "utf8");
  return parseCsvString(raw, { source });
}

export function parseCsvString(csvString, { source = "generic" } = {}) {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = indexMap(headers);

  // Simple header mapping for common formats (extend later)
  const dateKey = pickKey(idx, ["Date", "Transaction Date", "Posting Date"]);
  const descKey = pickKey(idx, ["Description", "Merchant", "Transaction Description"]);
  const amtKey  = pickKey(idx, ["Amount", "Debit", "Charge", "Transaction Amount"]);

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

function splitCsvLine(line) {
  // Minimal CSV splitter (handles quoted commas)
  const result = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' ) {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

function indexMap(headers) {
  const m = {};
  headers.forEach((h, i) => (m[h] = i));
  return m;
}

function pickKey(map, candidates) {
  for (const c of candidates) {
    if (map[c] !== undefined) return c;
  }
  return null;
}

function normalizeDate(s) {
  if (!s) return null;
  const t = s.trim();

  // If already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  // Common US: M/D/YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = String(m[1]).padStart(2, "0");
    const dd = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }

  return null;
}

function normalizeAmount(s) {
  if (s === undefined || s === null) return NaN;
  const t = String(s).replace(/[$,]/g, "").trim();
  const n = Number(t);
  return n;
}

function hash(str) {
  // tiny deterministic hash
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
