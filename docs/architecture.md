# Architecture

Family Office Tracker v0.2 follows a **policy-driven engine + thin CLI** architecture inspired by LedgerRun.

## Design Principles

1. **Zero dependencies**: Pure Node.js 20+ with ESM
2. **Policy-driven**: Rules determine categorization, not hard-coded logic
3. **Separation of concerns**: Clear module boundaries
4. **Extensibility**: Easy to add new parsers, rules, and exporters
5. **Testability**: Every module has isolated, deterministic tests
6. **Audit trail**: Every transaction tracks how it was categorized

## Module Structure

```
family-office-tracker/
├── packages/core/           # Business logic (zero deps)
│   └── src/
│       ├── parser.js        # CSV parsing orchestrator
│       ├── parsers/         # Source-specific adapters
│       │   ├── _shared.js   # Shared CSV utilities
│       │   ├── generic.js   # Generic CSV parser
│       │   ├── chase.js     # Chase credit card parser
│       │   └── costco.js    # Costco Citi parser
│       ├── rules-engine.js  # Rule matching and validation
│       ├── categorizer.js   # Transaction categorization
│       ├── exporter.js      # Schedule C export + reports
│       └── index.js         # Public API
├── apps/cli/                # Thin CLI layer
│   └── src/
│       └── cli.js           # Command-line interface
└── tests/                   # Tests + fixtures
    ├── core/                # Unit tests
    └── fixtures/            # Deterministic test data
```

## Data Flow

### 1. Import Phase

```
CSV File (source format)
    ↓
Parser (source adapter)
    ↓ normalize to common schema
Transactions JSON
```

**Schema:**
```json
{
  "id": "source:date:hash:lineNumber",
  "date": "YYYY-MM-DD",
  "description": "MERCHANT NAME",
  "amount": -123.45,
  "source": "chase"
}
```

**Key points:**
- Each source adapter normalizes to this schema
- Deterministic IDs for deduplication
- Negative amounts = charges, Positive = credits/returns
- Date always normalized to ISO format

### 2. Categorization Phase

```
Transactions JSON
    +
Rules File (policy)
    ↓
Rules Engine (match)
    ↓
Categorizer (apply actions)
    ↓
Categorized JSON + Alerts JSON
```

**Categorized Schema:**
```json
{
  "id": "source:date:hash:lineNumber",
  "date": "YYYY-MM-DD",
  "description": "MERCHANT NAME",
  "amount": -123.45,
  "source": "chase",
  "category": "Software",
  "venture": "my-venture",
  "requiresReceipt": false,
  "note": "Optional note",
  "audit": [
    {
      "step": "matched_rule",
      "ruleId": "openai-subscription",
      "when": { "contains": ["openai"] },
      "then": { "category": "Software", "venture": "my-venture" }
    }
  ]
}
```

**Split Allocation Schema:**
```json
{
  "id": "source:date:hash:lineNumber:split:0",
  "originalTxnId": "source:date:hash:lineNumber",
  "date": "YYYY-MM-DD",
  "description": "SHARED SERVICE",
  "amount": -60.0,
  "source": "chase",
  "category": "Shared Expense",
  "venture": "venture-a",
  "requiresReceipt": true,
  "note": "Primary allocation",
  "allocation": {
    "percent": 60,
    "originalAmount": -100.0,
    "splitIndex": 0,
    "totalSplits": 2
  },
  "audit": [
    {
      "step": "split_allocation",
      "ruleId": "shared-service",
      "allocation": { "venture": "venture-a", "percent": 60 }
    }
  ]
}
```

### 3. Export Phase

```
Categorized JSON
    ↓ filter by venture + year
    ↓
Schedule C CSV (with allocation fields)
```

**Export Schema:**
```csv
Date,Description,Amount,Category,Venture,Note,OriginalTxnId,SplitPercent,OriginalAmount
2025-01-15,SHARED SERVICE,-60.0,Shared Expense,venture-a,Primary,txn-123,60,-100.0
```

### 4. Reporting Phase

```
Categorized JSON
    ↓
Summary Generator
    ↓
Formatted Report (human-readable)
```

## Module Boundaries

### Parser Module (`parser.js` + `parsers/`)

**Responsibility:**
- Normalize CSV from various sources to common transaction schema
- Handle source-specific quirks (date formats, debit/credit columns, etc.)
- Generate deterministic transaction IDs

**Interface:**
```javascript
parseCsvFile(filePath, { source }) → Transaction[]
parseCsvString(csvString, { source }) → Transaction[]
```

**Source Adapters:**
- Each adapter exports `parse(csvString, source)` function
- Adapters use shared utilities from `_shared.js`
- Flexible header matching for robustness

**Extension:** To add a new source, create `parsers/newsource.js` and register in `PARSERS` map.

### Rules Engine Module (`rules-engine.js`)

**Responsibility:**
- Validate rules file structure
- Match transactions against rules with priority ordering
- Support multiple match types (regex, contains, amount ranges)

**Interface:**
```javascript
validateRulesFile(rulesFile) → boolean (throws on invalid)
matchRule(txn, rulesFile) → Rule | null
```

**Match Types:**
- `any_contains`: OR logic for keywords
- `all_contains`: AND logic for keywords
- `regex`: Pattern matching
- `amount_gt`, `amount_lt`, `amount_between`: Numeric comparisons
- All conditions combined with AND logic

**Priority:**
- Higher priority runs first (default: 0)
- Stable sort for equal priorities
- First matching rule wins

**Extension:** Add new match types in `matchesWhen()` function.

### Categorizer Module (`categorizer.js`)

**Responsibility:**
- Apply matched rules to transactions
- Handle simple categorization and split allocations
- Generate audit trail
- Create alerts for missing receipts

**Interface:**
```javascript
categorizeTransactions(txns, rulesFile) → { categorized, alerts }
```

**Split Allocation:**
- Creates multiple transactions from one source transaction
- Preserves `originalTxnId` for audit trail
- Calculates amounts based on percentages
- Adds allocation metadata

**Audit Trail:**
- Every transaction records how it was categorized
- Includes full rule details (when + then)
- Split allocations show allocation details

**Extension:** Modify `createSplitTransactions()` for custom allocation logic.

### Exporter Module (`exporter.js`)

**Responsibility:**
- Export filtered transactions to CSV
- Generate summary reports
- Create alerts for uncategorized transactions

**Interface:**
```javascript
exportScheduleC(categorized, { venture, year, outFile }) → { csv, count }
generateAlerts(categorized) → { uncategorizedCount, uncategorized }
generateSummary(categorized) → Summary
formatSummaryReport(summary) → string
```

**Export Format:**
- CSV with headers for Schedule C
- Includes allocation fields for split transactions
- Filters by venture and year

**Reports:**
- **Alerts**: Uncategorized transactions
- **Summary**: Totals by venture/category with top uncategorized merchants

**Extension:** Add new report types in separate functions, export from `index.js`.

### CLI Module (`apps/cli/src/cli.js`)

**Responsibility:**
- Parse command-line arguments
- Orchestrate module calls
- Handle errors with helpful messages
- Provide usage documentation

**Commands:**
- `import`: Parse CSV and save normalized transactions
- `plan`: Preview categorization (dry-run)
- `categorize`: Apply rules and save results
- `export`: Filter and export for Schedule C
- `report`: Generate reports

**Global Options:**
- `--out-dir`: Output directory (default: ./data)

**Extension:** Add new commands by adding cases in main try/catch block.

## Testing Strategy

### Unit Tests

**Location:** `tests/core/`

**Coverage:**
- `parser.test.js`: All source adapters with fixtures
- `rules.test.js`: All match types, priority, split validation
- `categorizer.test.js`: Simple + split categorization

**Fixtures:** `tests/fixtures/`
- Deterministic CSV files for each source type
- Minimal but comprehensive test cases

### Test Data Flow

```
Fixture CSV
    ↓ parseCsvFile()
Normalized Transactions
    ↓ categorizeTransactions()
Categorized Transactions
    ↓ assertions
```

**Principles:**
- No external dependencies
- Deterministic: Same input → same output
- Fast: All tests < 200ms
- Isolated: Each test is independent

## Extension Points

### Adding a New Parser Source

1. Create `packages/core/src/parsers/newsource.js`
2. Implement `export function parse(csvString, source)` that returns normalized transactions
3. Register in `packages/core/src/parser.js` PARSERS map
4. Add fixture in `tests/fixtures/newsource.csv`
5. Add tests in `tests/core/parser.test.js`

### Adding a New Rule Match Type

1. Add condition handler in `packages/core/src/rules-engine.js` `matchesWhen()`
2. Update JSDoc examples
3. Add validation in `validateRulesFile()` if needed
4. Add tests in `tests/core/rules.test.js`
5. Document in README.md

### Adding a New Export Format

1. Add function in `packages/core/src/exporter.js`
2. Export from `packages/core/src/index.js`
3. Add command option in `apps/cli/src/cli.js`
4. Update usage in CLI help text
5. Document in README.md

### Adding a New Report Type

1. Add generator function in `packages/core/src/exporter.js`
2. Export from `packages/core/src/index.js`
3. Add case in CLI `report` command
4. Update usage documentation
5. Add tests if complex logic

## Error Handling

### Parser Errors
- Missing required headers → clear error with found headers
- Invalid CSV format → show line number and issue
- Missing file → helpful message about file path

### Rules Errors
- Invalid JSON → show parse error and file path
- Missing required fields → show which field + rule ID
- Split percentages ≠ 100 → show actual sum
- Invalid regex → warning, rule skipped

### CLI Errors
- Missing required args → show usage example
- File not found → suggest running previous step
- Uncategorized in --strict → exit code 1 with count

**General Pattern:**
- Descriptive error messages
- Suggest corrective action
- Exit codes for CI/CD integration

## Performance Considerations

### CSV Parsing
- Streaming not needed (small files < 10k transactions)
- Simple line-by-line processing
- Minimal memory footprint

### Rule Matching
- Linear scan (acceptable for < 1000 rules)
- Priority sort once at categorization start
- Short-circuit on first match

### Export
- Filter in-memory (fast for typical datasets)
- CSV generation uses string concatenation (simple + fast)

**Scalability:**
- Current design handles 10k transactions × 1k rules easily
- For larger datasets, consider streaming or database

## Future Enhancements

Potential additions while maintaining architecture:

1. **Duplicate Detection**: Use deterministic IDs to skip reimporting
2. **Rule Templates**: Reusable rule fragments
3. **Multi-file Import**: Batch import from directory
4. **Receipt Matching**: Link receipts to transactions
5. **Bank API Integration**: Direct fetch from banks
6. **Web UI**: Visualization + manual categorization

All additions should maintain:
- Zero core dependencies
- Policy-driven approach
- Module boundaries
- Test coverage
