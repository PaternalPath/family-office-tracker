/**
 * Rules Engine for transaction categorization
 *
 * Rules format:
 * {
 *   "ventures": ["venture1", "venture2"],
 *   "rules": [
 *     {
 *       "id": "rule-id",
 *       "priority": 100,  // Higher runs first (optional, default: 0)
 *       "when": {
 *         // Matching conditions (all must pass):
 *         "contains": ["keyword"],              // DEPRECATED: use any_contains
 *         "any_contains": ["keyword"],          // At least one keyword matches
 *         "all_contains": ["key1", "key2"],     // All keywords must match
 *         "regex": { "pattern": "regex", "flags": "i" },
 *         "amount_gt": -100,
 *         "amount_lt": 0,
 *         "amount_between": { "min": -500, "max": -10 }
 *       },
 *       "then": {
 *         "category": "Software",
 *         "venture": "my-venture",
 *         "requiresReceipt": false,
 *         "note": "Optional note",
 *         "split": [  // Optional: split transaction across ventures
 *           { "venture": "venture1", "percent": 60, "note": "Primary allocation" },
 *           { "venture": "venture2", "percent": 40, "note": "Secondary allocation" }
 *         ]
 *       }
 *     }
 *   ]
 * }
 */

/**
 * Validate rules file structure
 * @param {Object} rulesFile - Rules configuration object
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateRulesFile(rulesFile) {
  if (!rulesFile || typeof rulesFile !== "object") {
    throw new Error("Rules file must be an object.");
  }
  if (!Array.isArray(rulesFile.rules)) {
    throw new Error("Rules file must contain rules[].");
  }

  for (const r of rulesFile.rules) {
    if (!r.id) throw new Error("Each rule must have id.");
    if (!r.when || typeof r.when !== "object") {
      throw new Error(`Rule ${r.id} missing when.`);
    }
    if (!r.then || typeof r.then !== "object") {
      throw new Error(`Rule ${r.id} missing then.`);
    }

    // Validate split if present
    if (r.then.split) {
      if (!Array.isArray(r.then.split)) {
        throw new Error(`Rule ${r.id}: split must be an array`);
      }

      let totalPercent = 0;
      for (const allocation of r.then.split) {
        if (!allocation.venture) {
          throw new Error(`Rule ${r.id}: split allocation missing venture`);
        }
        if (typeof allocation.percent !== "number" || allocation.percent <= 0) {
          throw new Error(
            `Rule ${r.id}: split allocation percent must be a positive number`
          );
        }
        totalPercent += allocation.percent;
      }

      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new Error(
          `Rule ${r.id}: split percentages must sum to 100 (got ${totalPercent})`
        );
      }
    }
  }
  return true;
}

/**
 * Sort rules by priority (higher first), maintaining stable order for equal priorities
 * @param {Array} rules - Array of rules
 * @returns {Array} Sorted rules
 */
function sortRulesByPriority(rules) {
  return rules
    .map((rule, index) => ({
      rule,
      priority: rule.priority ?? 0,
      originalIndex: index
    }))
    .sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Stable sort: maintain original order for equal priorities
      return a.originalIndex - b.originalIndex;
    })
    .map((item) => item.rule);
}

/**
 * Find the first matching rule for a transaction
 * @param {Object} txn - Transaction object
 * @param {Object} rulesFile - Rules configuration
 * @returns {Object|null} Matching rule or null
 */
export function matchRule(txn, rulesFile) {
  const sortedRules = sortRulesByPriority(rulesFile.rules);

  for (const rule of sortedRules) {
    if (matchesWhen(txn, rule.when)) return rule;
  }
  return null;
}

/**
 * Check if a transaction matches all conditions in a "when" clause
 * @param {Object} txn - Transaction object
 * @param {Object} when - When conditions
 * @returns {boolean} True if all conditions match
 */
function matchesWhen(txn, when) {
  const desc = txn.description.toLowerCase();

  // Backward compatibility: "contains" maps to "any_contains"
  if (when.contains) {
    if (!matchAnyContains(desc, when.contains)) return false;
  }

  // any_contains: at least one keyword must match
  if (when.any_contains) {
    if (!matchAnyContains(desc, when.any_contains)) return false;
  }

  // all_contains: all keywords must match
  if (when.all_contains) {
    if (!matchAllContains(desc, when.all_contains)) return false;
  }

  // regex: pattern match
  if (when.regex) {
    if (!matchRegex(desc, when.regex)) return false;
  }

  // amount_gt: amount must be greater than value
  if (typeof when.amount_gt === "number") {
    if (!(txn.amount > when.amount_gt)) return false;
  }

  // amount_lt: amount must be less than value
  if (typeof when.amount_lt === "number") {
    if (!(txn.amount < when.amount_lt)) return false;
  }

  // amount_between: amount must be between min and max (inclusive)
  if (when.amount_between) {
    const { min, max } = when.amount_between;
    if (typeof min !== "number" || typeof max !== "number") {
      throw new Error("amount_between requires numeric min and max");
    }
    if (!(txn.amount >= min && txn.amount <= max)) return false;
  }

  return true;
}

/**
 * Check if at least one keyword matches (case-insensitive)
 * @param {string} text - Lowercase text to search
 * @param {Array} keywords - Keywords to match
 * @returns {boolean} True if any keyword matches
 */
function matchAnyContains(text, keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) return true;
  return keywords.some((k) => text.includes(String(k).toLowerCase()));
}

/**
 * Check if all keywords match (case-insensitive)
 * @param {string} text - Lowercase text to search
 * @param {Array} keywords - Keywords to match
 * @returns {boolean} True if all keywords match
 */
function matchAllContains(text, keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) return true;
  return keywords.every((k) => text.includes(String(k).toLowerCase()));
}

/**
 * Check if text matches a regex pattern
 * @param {string} text - Text to match (already lowercase)
 * @param {Object|string} regexConfig - Regex config or pattern string
 * @returns {boolean} True if pattern matches
 */
function matchRegex(text, regexConfig) {
  try {
    let pattern, flags;

    if (typeof regexConfig === "string") {
      // Simple string pattern
      pattern = regexConfig;
      flags = "i"; // Default to case-insensitive
    } else if (typeof regexConfig === "object") {
      // Object with pattern and optional flags
      pattern = regexConfig.pattern || regexConfig.regex;
      flags = regexConfig.flags || "i";
    } else {
      return false;
    }

    const regex = new RegExp(pattern, flags);
    return regex.test(text);
  } catch (err) {
    // Invalid regex pattern
    console.warn(`Invalid regex pattern: ${err.message}`);
    return false;
  }
}
