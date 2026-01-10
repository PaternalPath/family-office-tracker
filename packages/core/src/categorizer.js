import { matchRule } from "./rules-engine.js";

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
