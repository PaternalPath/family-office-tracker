/**
 * Shared utilities for CSV parsers
 */

/**
 * Split a CSV line handling quoted commas
 * @param {string} line - CSV line to split
 * @returns {string[]} Array of column values
 */
export function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
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

/**
 * Create a map of header names to column indices
 * @param {string[]} headers - Array of header names
 * @returns {Object} Map of header name to index
 */
export function indexMap(headers) {
  const m = {};
  headers.forEach((h, i) => (m[h] = i));
  return m;
}

/**
 * Find the first matching key from candidates in the map
 * @param {Object} map - Header name to index map
 * @param {string[]} candidates - Candidate header names
 * @returns {string|null} First matching header name or null
 */
export function pickKey(map, candidates) {
  for (const c of candidates) {
    if (map[c] !== undefined) return c;
  }
  return null;
}

/**
 * Normalize various date formats to YYYY-MM-DD
 * @param {string} s - Date string to normalize
 * @returns {string|null} Normalized date or null
 */
export function normalizeDate(s) {
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

/**
 * Normalize amount string to number
 * @param {string|number} s - Amount to normalize
 * @returns {number} Normalized amount or NaN
 */
export function normalizeAmount(s) {
  if (s === undefined || s === null) return NaN;
  const t = String(s).replace(/[$,]/g, "").trim();
  const n = Number(t);
  return n;
}

/**
 * Generate a deterministic hash from a string
 * @param {string} str - String to hash
 * @returns {string} Hash in hex format
 */
export function hash(str) {
  // tiny deterministic hash (FNV-1a variant)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
