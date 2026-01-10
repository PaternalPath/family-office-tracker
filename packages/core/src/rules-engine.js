/**
 * Rules format (household.json):
 * {
 *   "ventures": ["dream-vacations", "paternal-path", "youman-house"],
 *   "rules": [
 *     {
 *       "id": "openai",
 *       "when": { "contains": ["OPENAI", "CHATGPT"] },
 *       "then": { "category": "Software", "venture": "youman-house", "requiresReceipt": false, "note": "AI tools" }
 *     }
 *   ]
 * }
 */

export function validateRulesFile(rulesFile) {
  if (!rulesFile || typeof rulesFile !== "object") throw new Error("Rules file must be an object.");
  if (!Array.isArray(rulesFile.rules)) throw new Error("Rules file must contain rules[].");
  for (const r of rulesFile.rules) {
    if (!r.id) throw new Error("Each rule must have id.");
    if (!r.when || typeof r.when !== "object") throw new Error(`Rule ${r.id} missing when.`);
    if (!r.then || typeof r.then !== "object") throw new Error(`Rule ${r.id} missing then.`);
  }
  return true;
}

export function matchRule(txn, rulesFile) {
  for (const rule of rulesFile.rules) {
    if (matchesWhen(txn, rule.when)) return rule;
  }
  return null;
}

function matchesWhen(txn, when) {
  // contains: array of keywords (case-insensitive) that must all appear OR any?
  // v1: ANY match triggers (simple)
  if (Array.isArray(when.contains) && when.contains.length > 0) {
    const desc = txn.description.toLowerCase();
    const hit = when.contains.some((k) => desc.includes(String(k).toLowerCase()));
    if (!hit) return false;
  }

  if (typeof when.amount_gt === "number") {
    if (!(txn.amount > when.amount_gt)) return false;
  }
  if (typeof when.amount_lt === "number") {
    if (!(txn.amount < when.amount_lt)) return false;
  }

  return true;
}
