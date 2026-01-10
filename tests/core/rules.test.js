import test from "node:test";
import assert from "node:assert/strict";
import { validateRulesFile, matchRule } from "../../packages/core/src/rules-engine.js";

test("validateRulesFile validates basic structure", () => {
  const rules = { rules: [{ id: "r1", when: { contains: ["X"] }, then: { category: "Software" } }] };
  assert.equal(validateRulesFile(rules), true);
});

test("matchRule finds first matching rule", () => {
  const rules = { rules: [{ id: "r1", when: { contains: ["openai"] }, then: { category: "Software" } }] };
  const rule = matchRule({ description: "OPENAI monthly", amount: -20 }, rules);
  assert.equal(rule.id, "r1");
});
