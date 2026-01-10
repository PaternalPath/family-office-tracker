import test from "node:test";
import assert from "node:assert/strict";
import { parseCsvString } from "../../packages/core/src/parser.js";

test("parseCsvString parses generic CSV", () => {
  const csv = "Date,Description,Amount\n2025-01-01,TEST,-10.5\n";
  const out = parseCsvString(csv, { source: "generic" });
  assert.equal(out.length, 1);
  assert.equal(out[0].date, "2025-01-01");
  assert.equal(out[0].description, "TEST");
  assert.equal(out[0].amount, -10.5);
});
