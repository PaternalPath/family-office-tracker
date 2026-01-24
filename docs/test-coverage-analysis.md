# Test Coverage Analysis

**Date:** January 2026
**Repository:** family-office-tracker

## Executive Summary

The codebase currently has **~20% test coverage** with 676 lines of test code covering ~2,500+ lines of source code. Core business logic (parsing, categorization, rules) is well-tested, but significant gaps exist in export functionality, CLI, storage, and React components.

---

## Current Test Infrastructure

### Frameworks Used
| Type | Framework | Location |
|------|-----------|----------|
| Unit Tests | Node.js built-in `node:test` + `node:assert/strict` | `tests/core/*.test.js` |
| E2E Tests | Playwright v1.49.1 | `tests/e2e/smoke.spec.js` |
| Component Tests | **None configured** | N/A |

### Test Files
1. `tests/core/parser.test.js` - 13 test cases (118 lines)
2. `tests/core/categorizer.test.js` - 7 test cases (154 lines)
3. `tests/core/rules.test.js` - 12 test cases (245 lines)
4. `tests/core/validation.test.js` - 14 test cases (157 lines)
5. `tests/e2e/smoke.spec.js` - 9 scenarios (152 lines)

### Test Fixtures
- `tests/fixtures/generic.csv` - Generic CSV format
- `tests/fixtures/chase.csv` - Chase bank format
- `tests/fixtures/costco.csv` - Costco card format

---

## Coverage By Component

### ✅ Well-Tested (Good Coverage)

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `packages/core/src/parser.js` | 128 | ✅ Tested | Parser routing, source detection |
| `packages/core/src/categorizer.js` | 129 | ✅ Tested | Split allocations, audit trails |
| `packages/core/src/rules-engine.js` | 228 | ⚠️ Partial | Matching tested, some edge cases missing |
| `packages/core/src/schemas.js` | 175 | ⚠️ Partial | TransactionSchema tested |

### ❌ Untested (Critical Gaps)

| File | Lines | Priority | Notes |
|------|-------|----------|-------|
| `packages/core/src/exporter.js` | 196 | **HIGH** | Zero test coverage |
| `apps/cli/src/cli.js` | 284 | **HIGH** | Zero test coverage |
| `apps/web/src/lib/storage.js` | 220 | **HIGH** | Zero test coverage |
| `apps/web/src/components/ResultsSection.jsx` | 554 | MEDIUM | E2E only |
| `apps/web/src/hooks/usePersistedState.js` | 88 | MEDIUM | Zero test coverage |
| `apps/web/src/components/UploadSection.jsx` | 190 | MEDIUM | E2E only |
| `apps/web/src/components/RulesSection.jsx` | 127 | MEDIUM | E2E only |

---

## Recommended Improvements

### 1. Add Tests for `exporter.js` (HIGH PRIORITY)

**Why:** Export functionality is critical for tax reporting (Schedule C). Bugs here could cause financial/compliance issues.

**Functions to test:**
- `exportScheduleC(categorizedTxns, { venture, year })`
- `generateAlerts(categorizedTxns)`
- `generateSummary(categorizedTxns)`
- `formatSummaryReport(summary)`
- `csvSafe(value)` (internal helper)
- `formatAmount(amount)` (internal helper)

**Suggested test cases:**

```javascript
// tests/core/exporter.test.js

test("exportScheduleC filters by venture and year", () => {
  const txns = [
    { date: "2025-01-15", venture: "venture-a", amount: -100, category: "Office", description: "Supplies" },
    { date: "2025-03-20", venture: "venture-b", amount: -50, category: "Travel", description: "Uber" },
    { date: "2024-12-01", venture: "venture-a", amount: -200, category: "Software", description: "Tools" }
  ];

  const result = exportScheduleC(txns, { venture: "venture-a", year: 2025 });
  assert.equal(result.count, 1);
  assert.ok(result.csv.includes("2025-01-15"));
  assert.ok(!result.csv.includes("venture-b"));
  assert.ok(!result.csv.includes("2024-12-01"));
});

test("exportScheduleC generates valid CSV with headers", () => {
  // Test CSV format, header row, proper escaping
});

test("exportScheduleC handles split transactions with allocation metadata", () => {
  // Test originalTxnId, splitPercent, originalAmount columns
});

test("csvSafe escapes commas and quotes", () => {
  // Test: "value,with,commas" -> "\"value,with,commas\""
  // Test: 'value"with"quotes' -> '"value""with""quotes"'
});

test("generateSummary calculates totals by venture and category", () => {
  // Test byVenture, byCategory, byVentureCategory aggregations
});

test("generateSummary identifies top uncategorized merchants", () => {
  // Test topUncategorized sorting and limiting
});

test("generateAlerts returns uncategorized transactions", () => {
  // Test uncategorizedCount and uncategorized array
});

test("formatSummaryReport produces readable output", () => {
  // Test report formatting, alignment, sections
});

test("formatAmount handles positive, negative, and zero amounts", () => {
  // Test sign handling and decimal formatting
});
```

---

### 2. Add Tests for CLI (`cli.js`) (HIGH PRIORITY)

**Why:** CLI is the primary interface for automated workflows and scripting. Untested CLI commands could silently fail or corrupt data.

**Commands to test:**
- `import` - CSV parsing and JSON output
- `plan` - Dry-run categorization
- `categorize` - Full categorization with alerts
- `export` - Schedule C export
- `report` - Summary/alerts generation

**Suggested approach:** Create a CLI test file that uses subprocess execution:

```javascript
// tests/cli/cli.test.js
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const CLI = "./apps/cli/src/cli.js";
const FIXTURES = "./tests/fixtures";

test("import command creates transactions.json", () => {
  const tmpDir = fs.mkdtempSync("/tmp/cli-test-");
  const result = spawnSync("node", [
    CLI, "import",
    "--file", `${FIXTURES}/generic.csv`,
    "--source", "generic",
    "--out-dir", tmpDir
  ]);

  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(tmpDir, "transactions.json")));

  const txns = JSON.parse(fs.readFileSync(path.join(tmpDir, "transactions.json")));
  assert.ok(txns.length > 0);

  fs.rmSync(tmpDir, { recursive: true });
});

test("import command fails without --file argument", () => {
  const result = spawnSync("node", [CLI, "import"]);
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.toString().includes("Missing required argument"));
});

test("categorize --strict fails on uncategorized transactions", () => {
  // Test strict mode exit code
});

test("export requires --venture and --year", () => {
  // Test argument validation
});

test("unknown command shows error", () => {
  const result = spawnSync("node", [CLI, "invalid-command"]);
  assert.notEqual(result.status, 0);
});
```

---

### 3. Add Tests for `storage.js` (HIGH PRIORITY)

**Why:** Storage bugs could cause data loss. This module handles localStorage persistence, migrations, and backup/restore.

**Functions to test:**
- `loadData()` / `saveData()`
- `migrateData()` - Schema migrations
- `clearAllData()`
- `hasStoredData()`
- `getStorageInfo()`
- `exportBackup()` / `importBackup()`

**Challenge:** Requires mocking `localStorage` in Node.js

**Suggested approach:**

```javascript
// tests/web/storage.test.js
import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage
const createMockLocalStorage = () => {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; }
  };
};

// Inject mock before importing module
global.localStorage = createMockLocalStorage();

// Dynamic import after mock setup
const { loadData, saveData, clearAllData, migrateData } = await import("../../apps/web/src/lib/storage.js");

test("loadData returns default state when localStorage is empty", () => {
  global.localStorage.clear();
  const data = loadData();
  assert.equal(data.version, 1);
  assert.deepEqual(data.transactions, []);
});

test("saveData persists and retrieves data", () => {
  saveData({ transactions: [{ id: "1" }] });
  const loaded = loadData();
  assert.equal(loaded.transactions.length, 1);
});

test("migrateData upgrades version 0 to version 1", () => {
  const oldData = { transactions: [{ id: "1" }] }; // No version
  const migrated = migrateData(oldData);
  assert.equal(migrated.version, 1);
});

test("importBackup validates JSON format", () => {
  // Test invalid JSON handling
});

test("clearAllData removes all stored data", () => {
  saveData({ transactions: [{ id: "1" }] });
  clearAllData();
  const data = loadData();
  assert.deepEqual(data.transactions, []);
});
```

---

### 4. Add React Component Tests (MEDIUM PRIORITY)

**Why:** ResultsSection.jsx alone is 554 lines with complex logic for tabs, filtering, and export. E2E tests catch regressions but don't isolate component behavior.

**Recommended setup:** Add Vitest + React Testing Library

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Example component test:**

```jsx
// apps/web/src/components/__tests__/ResultsSection.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ResultsSection from "../ResultsSection";

describe("ResultsSection", () => {
  const mockCategorized = [
    { id: "1", date: "2025-01-01", description: "Test", amount: -100, category: "Office" }
  ];

  const mockSummary = {
    totalTransactions: 1,
    uncategorizedCount: 0,
    byVenture: { "venture-a": -100 },
    byCategory: { "Office": -100 }
  };

  it("renders tab navigation", () => {
    render(<ResultsSection categorized={mockCategorized} summary={mockSummary} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
  });

  it("filters transactions by search term", () => {
    render(<ResultsSection categorized={mockCategorized} summary={mockSummary} />);
    fireEvent.click(screen.getByText("Transactions"));
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "xyz" } });
    expect(screen.queryByText("Test")).not.toBeInTheDocument();
  });
});
```

---

### 5. Add `usePersistedState` Hook Tests (MEDIUM PRIORITY)

**Why:** This hook manages all app state and auto-persistence. Bugs could cause data loss or stale state.

```javascript
// Test with @testing-library/react-hooks or Vitest
import { renderHook, act } from "@testing-library/react";
import { usePersistedState } from "../hooks/usePersistedState";

test("setTransactions clears categorized state", () => {
  const { result } = renderHook(() => usePersistedState());

  act(() => {
    result.current.setCategorization([{ id: "1" }], { total: 1 });
  });

  act(() => {
    result.current.setTransactions([{ id: "2" }]);
  });

  expect(result.current.categorized).toBeNull();
});
```

---

### 6. Expand Parser Edge Case Tests (LOWER PRIORITY)

Current tests use fixtures but don't cover edge cases directly:

```javascript
// tests/core/parser-edge-cases.test.js

test("parser handles empty description field", () => {});
test("parser handles extremely long descriptions", () => {});
test("parser handles special characters in merchant names", () => {});
test("parser handles dates at year boundaries", () => {});
test("parser handles amounts with many decimal places", () => {});
test("parser generates consistent IDs for duplicate transactions", () => {});
```

---

## Implementation Roadmap

### Phase 1: Critical Gaps (Recommended First)
1. ✅ Create `tests/core/exporter.test.js`
2. ✅ Create `tests/cli/cli.test.js`
3. ✅ Create `tests/web/storage.test.js`

### Phase 2: Component Testing Infrastructure
4. Install Vitest + React Testing Library
5. Create component test files
6. Add hook tests

### Phase 3: Comprehensive Coverage
7. Add parser edge case tests
8. Add error path tests for all modules
9. Set up coverage reporting (c8 or nyc)

---

## Suggested Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:unit": "node --test tests/core/*.test.js",
    "test:cli": "node --test tests/cli/*.test.js",
    "test:web": "vitest run",
    "test:e2e": "playwright test",
    "test:all": "npm run test:unit && npm run test:cli && npm run test:web && npm run test:e2e",
    "test:coverage": "c8 npm run test:unit"
  }
}
```

---

## Summary of Gaps

| Area | Current State | Recommended Action |
|------|---------------|-------------------|
| Export functions | ❌ 0% | Add 10+ test cases |
| CLI commands | ❌ 0% | Add integration tests |
| Storage module | ❌ 0% | Add with localStorage mock |
| React components | ⚠️ E2E only | Add component tests |
| Custom hooks | ❌ 0% | Add hook tests |
| Parser edge cases | ⚠️ Fixtures only | Add direct edge case tests |

**Target:** Achieve 60%+ coverage by addressing Phase 1 items.
