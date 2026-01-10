import test from "node:test";
import assert from "node:assert/strict";
import { categorizeTransactions } from "../../packages/core/src/categorizer.js";

test("categorizeTransactions assigns category + audit", () => {
  const rules = { rules: [{ id: "r1", when: { contains: ["chatgpt"] }, then: { category: "Software", venture: "youman-house", requiresReceipt: false } }] };
  const txns = [{ id: "1", date: "2025-01-01", description: "CHATGPT", amount: -20, source: "generic" }];
  const { categorized } = categorizeTransactions(txns, rules);
  assert.equal(categorized[0].category, "Software");
  assert.equal(categorized[0].venture, "youman-house");
  assert.ok(Array.isArray(categorized[0].audit));
});
