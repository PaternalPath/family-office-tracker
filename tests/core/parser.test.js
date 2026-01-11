import test from "node:test";
import assert from "node:assert/strict";
import { parseCsvString, parseCsvFile } from "../../packages/core/src/parser.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "../fixtures");

test("parseCsvString parses generic CSV", () => {
  const csv = "Date,Description,Amount\n2025-01-01,TEST,-10.5\n";
  const out = parseCsvString(csv, { source: "generic" });
  assert.equal(out.length, 1);
  assert.equal(out[0].date, "2025-01-01");
  assert.equal(out[0].description, "TEST");
  assert.equal(out[0].amount, -10.5);
  assert.equal(out[0].source, "generic");
  assert.ok(out[0].id.startsWith("generic:"));
});

test("parseCsvFile loads and parses generic fixture", () => {
  const file = path.join(fixturesDir, "generic.csv");
  const out = parseCsvFile(file, { source: "generic" });

  assert.equal(out.length, 3);
  assert.equal(out[0].description, "COSTCO WHOLESALE #123");
  assert.equal(out[0].amount, -142.18);
  assert.equal(out[1].description, "OPENAI SUBSCRIPTION");
  assert.equal(out[1].amount, -20.00);
  assert.equal(out[2].description, "REFUND RETAILER");
  assert.equal(out[2].amount, 35.50);
});

test("parseCsvFile loads and parses Chase fixture", () => {
  const file = path.join(fixturesDir, "chase.csv");
  const out = parseCsvFile(file, { source: "chase" });

  assert.equal(out.length, 4);

  // Sale should be negative
  assert.equal(out[0].description, "STARBUCKS STORE 12345");
  assert.equal(out[0].amount, -5.75);
  assert.equal(out[0].source, "chase");

  // Sale with memo
  assert.ok(out[1].description.includes("AMAZON.COM"));
  assert.ok(out[1].description.includes("[Office supplies]"));
  assert.equal(out[1].amount, -89.99);

  // Return should be positive
  assert.equal(out[2].description, "REFUND - RETAILER");
  assert.equal(out[2].amount, 25.00);

  // Payment should be positive
  assert.equal(out[3].description, "PAYMENT THANK YOU");
  assert.equal(out[3].amount, 500.00);
});

test("parseCsvFile loads and parses Costco fixture", () => {
  const file = path.join(fixturesDir, "costco.csv");
  const out = parseCsvFile(file, { source: "costco" });

  assert.equal(out.length, 4);

  // Debits should be negative
  assert.equal(out[0].description, "COSTCO GASOLINE");
  assert.equal(out[0].amount, -45.60);
  assert.equal(out[0].source, "costco");

  assert.equal(out[1].description, "COSTCO WHOLESALE");
  assert.equal(out[1].amount, -234.18);

  // Credit (payment) should be positive
  assert.equal(out[3].description, "PAYMENT - THANK YOU");
  assert.equal(out[3].amount, 500.00);
});

test("parseCsvString throws on unknown source", () => {
  const csv = "Date,Description,Amount\n2025-01-01,TEST,-10.5\n";

  assert.throws(
    () => parseCsvString(csv, { source: "invalid" }),
    /Unknown source/
  );
});

test("parseCsvFile throws on missing file", () => {
  assert.throws(
    () => parseCsvFile("/nonexistent/file.csv"),
    /File not found/
  );
});

test("parseCsvString handles US date format", () => {
  const csv = "Date,Description,Amount\n1/5/2025,TEST,-10.5\n";
  const out = parseCsvString(csv, { source: "generic" });

  assert.equal(out.length, 1);
  assert.equal(out[0].date, "2025-01-05");
});

test("parseCsvString handles quoted descriptions with commas", () => {
  const csv = 'Date,Description,Amount\n2025-01-01,"STORE, INC.",-10.5\n';
  const out = parseCsvString(csv, { source: "generic" });

  assert.equal(out.length, 1);
  assert.equal(out[0].description, "STORE, INC.");
});

test("parseCsvString generates deterministic IDs", () => {
  const csv = "Date,Description,Amount\n2025-01-01,TEST,-10.5\n";
  const out1 = parseCsvString(csv, { source: "generic" });
  const out2 = parseCsvString(csv, { source: "generic" });

  assert.equal(out1[0].id, out2[0].id);
});
