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

test("matchRule supports regex matching", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { regex: { pattern: "^AMAZON.*PRIME$", flags: "i" } },
        then: { category: "Subscriptions" }
      }
    ]
  };

  const matched = matchRule({ description: "amazon prime", amount: -14.99 }, rules);
  assert.equal(matched.id, "r1");

  const notMatched = matchRule({ description: "AMAZON marketplace", amount: -25 }, rules);
  assert.equal(notMatched, null);
});

test("matchRule supports any_contains", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { any_contains: ["starbucks", "coffee"] },
        then: { category: "Food" }
      }
    ]
  };

  const matched1 = matchRule({ description: "STARBUCKS 123", amount: -5 }, rules);
  assert.equal(matched1.id, "r1");

  const matched2 = matchRule({ description: "LOCAL COFFEE SHOP", amount: -4 }, rules);
  assert.equal(matched2.id, "r1");

  const notMatched = matchRule({ description: "GROCERY STORE", amount: -50 }, rules);
  assert.equal(notMatched, null);
});

test("matchRule supports all_contains", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { all_contains: ["amazon", "prime"] },
        then: { category: "Subscriptions" }
      }
    ]
  };

  const matched = matchRule({ description: "AMAZON PRIME MEMBERSHIP", amount: -14.99 }, rules);
  assert.equal(matched.id, "r1");

  const notMatched = matchRule({ description: "AMAZON MARKETPLACE", amount: -25 }, rules);
  assert.equal(notMatched, null);
});

test("matchRule supports amount_between", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { amount_between: { min: -100, max: -10 } },
        then: { category: "Medium Expense" }
      }
    ]
  };

  const matched = matchRule({ description: "TEST", amount: -50 }, rules);
  assert.equal(matched.id, "r1");

  const tooSmall = matchRule({ description: "TEST", amount: -5 }, rules);
  assert.equal(tooSmall, null);

  const tooLarge = matchRule({ description: "TEST", amount: -200 }, rules);
  assert.equal(tooLarge, null);

  // Test boundary conditions
  const atMin = matchRule({ description: "TEST", amount: -100 }, rules);
  assert.equal(atMin.id, "r1");

  const atMax = matchRule({ description: "TEST", amount: -10 }, rules);
  assert.equal(atMax.id, "r1");
});

test("matchRule respects priority ordering", () => {
  const rules = {
    rules: [
      { id: "r1", priority: 10, when: { contains: ["test"] }, then: { category: "Low" } },
      { id: "r2", priority: 100, when: { contains: ["test"] }, then: { category: "High" } },
      { id: "r3", priority: 50, when: { contains: ["test"] }, then: { category: "Medium" } }
    ]
  };

  const matched = matchRule({ description: "test merchant", amount: -10 }, rules);
  assert.equal(matched.id, "r2"); // Highest priority wins
  assert.equal(matched.then.category, "High");
});

test("matchRule maintains stable sort for equal priorities", () => {
  const rules = {
    rules: [
      { id: "r1", when: { contains: ["test"] }, then: { category: "First" } },
      { id: "r2", when: { contains: ["test"] }, then: { category: "Second" } },
      { id: "r3", when: { contains: ["test"] }, then: { category: "Third" } }
    ]
  };

  const matched = matchRule({ description: "test merchant", amount: -10 }, rules);
  assert.equal(matched.id, "r1"); // First rule wins when priorities are equal
});

test("matchRule combines multiple conditions (AND)", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: {
          all_contains: ["amazon"],
          amount_between: { min: -20, max: -10 }
        },
        then: { category: "Small Amazon Purchase" }
      }
    ]
  };

  const matched = matchRule({ description: "AMAZON.COM", amount: -15 }, rules);
  assert.equal(matched.id, "r1");

  const wrongMerchant = matchRule({ description: "WALMART", amount: -15 }, rules);
  assert.equal(wrongMerchant, null);

  const wrongAmount = matchRule({ description: "AMAZON.COM", amount: -50 }, rules);
  assert.equal(wrongAmount, null);
});

test("validateRulesFile validates split configuration", () => {
  const validSplit = {
    rules: [
      {
        id: "r1",
        when: { contains: ["test"] },
        then: {
          category: "Shared",
          split: [
            { venture: "v1", percent: 60 },
            { venture: "v2", percent: 40 }
          ]
        }
      }
    ]
  };

  assert.equal(validateRulesFile(validSplit), true);

  // Test invalid split - doesn't sum to 100
  const invalidSum = {
    rules: [
      {
        id: "r1",
        when: { contains: ["test"] },
        then: {
          category: "Shared",
          split: [
            { venture: "v1", percent: 50 },
            { venture: "v2", percent: 30 }
          ]
        }
      }
    ]
  };

  assert.throws(() => validateRulesFile(invalidSum), /must sum to 100/);

  // Test invalid split - missing venture
  const missingVenture = {
    rules: [
      {
        id: "r1",
        when: { contains: ["test"] },
        then: {
          category: "Shared",
          split: [
            { percent: 100 }
          ]
        }
      }
    ]
  };

  assert.throws(() => validateRulesFile(missingVenture), /missing venture/);

  // Test invalid split - negative percent
  const negativePercent = {
    rules: [
      {
        id: "r1",
        when: { contains: ["test"] },
        then: {
          category: "Shared",
          split: [
            { venture: "v1", percent: -50 },
            { venture: "v2", percent: 150 }
          ]
        }
      }
    ]
  };

  assert.throws(() => validateRulesFile(negativePercent), /must be a positive number/);
});

test("backward compatibility: contains works as any_contains", () => {
  const rules = {
    rules: [
      {
        id: "r1",
        when: { contains: ["openai", "chatgpt"] },
        then: { category: "AI" }
      }
    ]
  };

  const matched1 = matchRule({ description: "OPENAI subscription", amount: -20 }, rules);
  assert.equal(matched1.id, "r1");

  const matched2 = matchRule({ description: "CHATGPT plus", amount: -20 }, rules);
  assert.equal(matched2.id, "r1");
});
