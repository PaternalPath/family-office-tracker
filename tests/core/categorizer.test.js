import test from "node:test";
import assert from "node:assert/strict";
import { categorizeTransactions } from "../../packages/core/src/categorizer.js";

test("categorizeTransactions assigns category + audit", () => {
  const rules = { rules: [{ id: "r1", when: { contains: ["chatgpt"] }, then: { category: "Software", venture: "venture-c", requiresReceipt: false } }] };
  const txns = [{ id: "1", date: "2025-01-01", description: "CHATGPT", amount: -20, source: "generic" }];
  const { categorized } = categorizeTransactions(txns, rules);
  assert.equal(categorized[0].category, "Software");
  assert.equal(categorized[0].venture, "venture-c");
  assert.ok(Array.isArray(categorized[0].audit));
});

test("categorizeTransactions handles split allocation", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { contains: ["shared"] },
        then: {
          category: "Shared Expense",
          split: [
            { venture: "venture-a", percent: 60, note: "Primary" },
            { venture: "venture-b", percent: 40, note: "Secondary" }
          ]
        }
      }
    ]
  };

  const txns = [
    { id: "txn-1", date: "2025-01-01", description: "SHARED SERVICE", amount: -100, source: "generic" }
  ];

  const { categorized } = categorizeTransactions(txns, rules);

  // Should create 2 transactions from split
  assert.equal(categorized.length, 2);

  // First allocation (60%)
  assert.equal(categorized[0].venture, "venture-a");
  assert.equal(categorized[0].amount, -60);
  assert.equal(categorized[0].category, "Shared Expense");
  assert.equal(categorized[0].note, "Primary");
  assert.equal(categorized[0].originalTxnId, "txn-1");
  assert.equal(categorized[0].allocation.percent, 60);
  assert.equal(categorized[0].allocation.originalAmount, -100);
  assert.equal(categorized[0].allocation.splitIndex, 0);
  assert.equal(categorized[0].allocation.totalSplits, 2);

  // Second allocation (40%)
  assert.equal(categorized[1].venture, "venture-b");
  assert.equal(categorized[1].amount, -40);
  assert.equal(categorized[1].category, "Shared Expense");
  assert.equal(categorized[1].note, "Secondary");
  assert.equal(categorized[1].originalTxnId, "txn-1");
  assert.equal(categorized[1].allocation.percent, 40);
  assert.equal(categorized[1].allocation.originalAmount, -100);

  // Check audit trail
  assert.equal(categorized[0].audit[0].step, "split_allocation");
  assert.equal(categorized[0].audit[0].ruleId, "r1");
  assert.equal(categorized[1].audit[0].step, "split_allocation");
});

test("categorizeTransactions preserves original transaction for non-split", () => {
  const rules = {
    rules: [
      { id: "r1", when: { contains: ["test"] }, then: { category: "Test", venture: "test-venture" } }
    ]
  };

  const txns = [
    { id: "txn-1", date: "2025-01-01", description: "TEST MERCHANT", amount: -50, source: "generic" }
  ];

  const { categorized } = categorizeTransactions(txns, rules);

  assert.equal(categorized.length, 1);
  assert.equal(categorized[0].id, "txn-1"); // Original ID preserved
  assert.equal(categorized[0].originalTxnId, undefined); // No split, so no originalTxnId
  assert.equal(categorized[0].allocation, undefined); // No allocation metadata
});

test("categorizeTransactions handles mixed split and non-split transactions", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { contains: ["shared"] },
        then: {
          category: "Shared",
          split: [
            { venture: "v1", percent: 50 },
            { venture: "v2", percent: 50 }
          ]
        }
      },
      {
        id: "r2",
        when: { contains: ["solo"] },
        then: { category: "Solo", venture: "v1" }
      }
    ]
  };

  const txns = [
    { id: "txn-1", date: "2025-01-01", description: "SHARED EXPENSE", amount: -100, source: "generic" },
    { id: "txn-2", date: "2025-01-02", description: "SOLO EXPENSE", amount: -50, source: "generic" }
  ];

  const { categorized } = categorizeTransactions(txns, rules);

  assert.equal(categorized.length, 3); // 2 from split + 1 solo

  // Verify split transactions
  assert.equal(categorized[0].originalTxnId, "txn-1");
  assert.equal(categorized[1].originalTxnId, "txn-1");

  // Verify solo transaction
  assert.equal(categorized[2].id, "txn-2");
  assert.equal(categorized[2].originalTxnId, undefined);
});

test("categorizeTransactions creates alerts for split transactions requiring receipts", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { contains: ["shared"] },
        then: {
          category: "Shared",
          requiresReceipt: true,
          split: [
            { venture: "v1", percent: 50 },
            { venture: "v2", percent: 50 }
          ]
        }
      }
    ]
  };

  const txns = [
    { id: "txn-1", date: "2025-01-01", description: "SHARED SERVICE", amount: -100, source: "generic" }
  ];

  const { alerts } = categorizeTransactions(txns, rules);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "missing_receipt");
  assert.equal(alerts[0].txnId, "txn-1");
  assert.ok(alerts[0].message.includes("split across 2 ventures"));
});
