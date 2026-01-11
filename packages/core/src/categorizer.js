import { matchRule } from "./rules-engine.js";

/**
 * Categorize transactions according to rules
 * Handles both simple categorization and split allocations
 *
 * @param {Array} transactions - Array of transactions to categorize
 * @param {Object} rulesFile - Rules configuration
 * @returns {Object} { categorized, alerts }
 */
export function categorizeTransactions(transactions, rulesFile) {
  const categorized = [];
  const alerts = [];

  for (const txn of transactions) {
    const rule = matchRule(txn, rulesFile);

    if (!rule) {
      categorized.push({
        ...txn,
        category: "Uncategorized",
        venture: "unassigned",
        requiresReceipt: false,
        audit: [{ step: "no_match", ruleId: null }]
      });
      continue;
    }

    const then = rule.then || {};

    // Handle split allocation
    if (then.split && Array.isArray(then.split)) {
      const splitTxns = createSplitTransactions(txn, rule);
      categorized.push(...splitTxns);

      // Check for receipt requirement on split transactions
      if (Boolean(then.requiresReceipt)) {
        alerts.push({
          type: "missing_receipt",
          txnId: txn.id,
          message: `Receipt required for ${txn.description} (${txn.amount}) - split across ${then.split.length} ventures`,
          ruleId: rule.id
        });
      }
      continue;
    }

    // Standard single-venture categorization
    const category = then.category ?? "Uncategorized";
    const venture = then.venture ?? "unassigned";
    const requiresReceipt = Boolean(then.requiresReceipt);

    const item = {
      ...txn,
      category,
      venture,
      requiresReceipt,
      note: then.note ?? "",
      audit: [
        { step: "matched_rule", ruleId: rule.id, when: rule.when, then: rule.then }
      ]
    };

    categorized.push(item);

    if (requiresReceipt) {
      alerts.push({
        type: "missing_receipt",
        txnId: txn.id,
        message: `Receipt required for ${txn.description} (${txn.amount})`,
        ruleId: rule.id
      });
    }
  }

  return { categorized, alerts };
}

/**
 * Create multiple transactions from a split allocation
 * @param {Object} txn - Original transaction
 * @param {Object} rule - Matching rule with split configuration
 * @returns {Array} Array of split transactions
 */
function createSplitTransactions(txn, rule) {
  const { split, category, requiresReceipt } = rule.then;
  const splitTxns = [];

  for (let i = 0; i < split.length; i++) {
    const allocation = split[i];
    const allocatedAmount = (txn.amount * allocation.percent) / 100;

    splitTxns.push({
      ...txn,
      // Preserve original transaction ID for traceability
      originalTxnId: txn.id,
      // Create unique ID for this allocation
      id: `${txn.id}:split:${i}`,
      // Allocated values
      amount: allocatedAmount,
      venture: allocation.venture,
      category: category ?? "Uncategorized",
      requiresReceipt: Boolean(requiresReceipt),
      note: allocation.note ?? "",
      // Allocation metadata
      allocation: {
        percent: allocation.percent,
        originalAmount: txn.amount,
        splitIndex: i,
        totalSplits: split.length
      },
      // Audit trail
      audit: [
        {
          step: "split_allocation",
          ruleId: rule.id,
          when: rule.when,
          then: rule.then,
          allocation: {
            venture: allocation.venture,
            percent: allocation.percent
          }
        }
      ]
    });
  }

  return splitTxns;
}
