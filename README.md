# Family Office Tracker (v0.2)

Policy-driven transaction categorization + Schedule C-ready exports.

**Architecture:** Policy-driven engine + thin CLI (inspired by LedgerRun)

> **Note:** This repository uses generic example venture names. Customize venture names in your local rules files to match your actual business entities.

## Features

- **Multi-source CSV parsing**: Import from Chase, Costco Citi, or generic CSVs
- **Advanced rule matching**: Regex, keyword matching (any/all), amount ranges, priority-based rules
- **Transaction splitting**: Allocate expenses across multiple ventures with audit trail
- **Plan mode**: Preview categorization without writing files
- **Strict mode**: Fail if uncategorized transactions exist (CI-friendly)
- **Summary reports**: Totals by venture/category with top uncategorized merchants
- **Zero dependencies**: Pure Node.js 20+ with ESM

## Quick Start

```bash
npm install
npm test

# See all commands
npm run help

# Preview categorization (dry-run)
npm run plan -- --file ./samples/sample.csv --rules ./rules/household.json

# Import transactions
npm run import -- --file ./samples/sample.csv --source generic

# Categorize with strict mode
npm run categorize -- --rules ./rules/household.json --strict

# View summary
npm run report -- --type summary

# Export for a venture
npm run export -- --venture travel-franchise --year 2025
```

## Commands

### `import` - Import CSV transactions

Import bank/card statements into normalized format.

```bash
npm run import -- --file <path> [--source <type>] [--out-dir <dir>]
```

**Options:**
- `--file <path>`: CSV file to import (required)
- `--source <type>`: Source type - `generic`, `chase`, `costco` (default: `generic`)
- `--out-dir <dir>`: Output directory (default: `./data`)

**Examples:**
```bash
npm run import -- --file bank.csv --source chase
npm run import -- --file costco-export.csv --source costco
npm run import -- --file transactions.csv --source generic --out-dir ./my-data
```

### `plan` - Preview categorization

Analyze transactions and show what would be categorized, without writing files.

```bash
npm run plan -- --file <path> [--source <type>] [--rules <path>]
```

**Options:**
- `--file <path>`: CSV file to analyze (required)
- `--source <type>`: Source type (default: `generic`)
- `--rules <path>`: Rules file (default: `rules/household.json`)

**Example:**
```bash
npm run plan -- --file bank.csv --source chase --rules ./rules/household.json
```

### `categorize` - Categorize transactions

Apply rules to imported transactions.

```bash
npm run categorize -- [--rules <path>] [--strict] [--out-dir <dir>]
```

**Options:**
- `--rules <path>`: Rules file (default: `rules/household.json`)
- `--strict`: Exit with error if uncategorized transactions exist
- `--out-dir <dir>`: Output directory (default: `./data`)

**Examples:**
```bash
npm run categorize -- --rules ./rules/household.json
npm run categorize -- --strict  # Fail on uncategorized (CI-friendly)
```

### `export` - Export for Schedule C

Export categorized transactions for a specific venture and year.

```bash
npm run export -- --venture <name> --year <year> [--out <file>] [--out-dir <dir>]
```

**Options:**
- `--venture <name>`: Venture to export (required)
- `--year <year>`: Year to export (required)
- `--out <file>`: Output CSV file (optional)
- `--out-dir <dir>`: Data directory (default: `./data`)

**Example:**
```bash
npm run export -- --venture travel-franchise --year 2025 --out tf-2025.csv
```

### `report` - Generate reports

View summaries and alerts.

```bash
npm run report -- [--type <type>] [--out-dir <dir>]
```

**Options:**
- `--type <type>`: Report type - `summary`, `alerts` (default: `summary`)
- `--out-dir <dir>`: Data directory (default: `./data`)

**Examples:**
```bash
npm run report -- --type summary
npm run report -- --type alerts
```

## CSV Source Formats

### Generic CSV

Works with most bank exports. Flexible header matching.

**Supported headers:**
- **Date**: `Date`, `Transaction Date`, `Posting Date`
- **Description**: `Description`, `Merchant`, `Transaction Description`
- **Amount**: `Amount`, `Debit`, `Charge`, `Transaction Amount`

**Example:**
```csv
Date,Description,Amount
1/15/2025,COSTCO WHOLESALE,-142.18
1/16/2025,OPENAI SUBSCRIPTION,-20.00
```

### Chase Credit Card

Handles Chase credit card export format with Type field.

**Supported headers:**
- `Transaction Date`, `Post Date`
- `Description`
- `Amount`
- `Type` (Sale/Return/Payment)
- `Memo` (optional - appended to description)

**Example:**
```csv
Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/10/2025,01/11/2025,STARBUCKS,Food,Sale,5.75,
01/15/2025,01/15/2025,PAYMENT THANK YOU,Payment,Payment,500.00,
```

### Costco Anywhere Visa (Citi)

Handles Costco Citi export with separate Debit/Credit columns.

**Supported headers:**
- `Status`, `Date`
- `Description`, `Merchant`
- `Debit`, `Credit` (separate columns)
- `Member` (optional)

**Example:**
```csv
Status,Date,Description,Debit,Credit,Member
Cleared,01/10/2025,COSTCO GASOLINE,45.60,,PRIMARY
Cleared,01/13/2025,PAYMENT - THANK YOU,,500.00,PRIMARY
```

## Rules Format

Rules are stored in JSON files (e.g., `rules/household.json`).

### Basic Structure

```json
{
  "ventures": ["venture-a", "venture-b", "venture-c"],
  "rules": [
    {
      "id": "unique-rule-id",
      "priority": 100,
      "when": { },
      "then": { }
    }
  ]
}
```

### Rule Priority

Higher priority rules run first. Default priority: `0`. Stable sort for equal priorities.

```json
{
  "id": "high-priority-amazon",
  "priority": 100,
  "when": { "contains": ["amazon"] },
  "then": { "category": "Priority Amazon", "venture": "venture-a" }
}
```

### Matching Conditions (`when`)

All conditions must match (AND logic).

#### `any_contains` - At least one keyword matches

```json
{
  "when": { "any_contains": ["starbucks", "coffee", "cafe"] }
}
```

#### `all_contains` - All keywords must match

```json
{
  "when": { "all_contains": ["amazon", "prime"] }
}
```

#### `contains` - Backward compatible (same as `any_contains`)

```json
{
  "when": { "contains": ["openai", "chatgpt"] }
}
```

#### `regex` - Regular expression matching

```json
{
  "when": {
    "regex": { "pattern": "^AMAZON.*PRIME$", "flags": "i" }
  }
}
```

Or simplified:
```json
{
  "when": { "regex": "^STARBUCKS.*#\\d+$" }
}
```

#### `amount_gt`, `amount_lt` - Amount comparisons

```json
{
  "when": {
    "amount_gt": -100,
    "amount_lt": -10
  }
}
```

#### `amount_between` - Amount range (inclusive)

```json
{
  "when": {
    "amount_between": { "min": -500, "max": -10 }
  }
}
```

#### Combining conditions

```json
{
  "when": {
    "all_contains": ["amazon"],
    "amount_between": { "min": -20, "max": -10 },
    "regex": "AMAZON.*DIGITAL"
  }
}
```

### Actions (`then`)

#### Simple categorization

```json
{
  "then": {
    "category": "Software",
    "venture": "my-venture",
    "requiresReceipt": true,
    "note": "AI subscription"
  }
}
```

#### Split allocation

Split a transaction across multiple ventures. Percentages must sum to 100.

```json
{
  "then": {
    "category": "Shared Office",
    "requiresReceipt": true,
    "split": [
      { "venture": "venture-a", "percent": 60, "note": "Primary allocation" },
      { "venture": "venture-b", "percent": 40, "note": "Secondary allocation" }
    ]
  }
}
```

**Output:** Creates multiple transactions with allocation metadata:
- `originalTxnId`: Original transaction ID
- `allocation.percent`: Allocation percentage
- `allocation.originalAmount`: Original amount before split
- `allocation.splitIndex`: Index in split array
- `allocation.totalSplits`: Total number of splits

### Complete Rule Example

```json
{
  "ventures": ["travel-franchise", "paternal-path", "youman-house"],
  "rules": [
    {
      "id": "openai-subscription",
      "priority": 50,
      "when": {
        "any_contains": ["openai", "chatgpt"],
        "amount_lt": 0
      },
      "then": {
        "category": "Software",
        "venture": "youman-house",
        "requiresReceipt": false,
        "note": "AI tools subscription"
      }
    },
    {
      "id": "shared-office-internet",
      "priority": 100,
      "when": {
        "regex": { "pattern": "COMCAST|XFINITY", "flags": "i" },
        "amount_between": { "min": -200, "max": -50 }
      },
      "then": {
        "category": "Internet",
        "requiresReceipt": true,
        "split": [
          { "venture": "youman-house", "percent": 60, "note": "Primary use" },
          { "venture": "paternal-path", "percent": 40, "note": "Secondary use" }
        ]
      }
    }
  ]
}
```

## Data Flow

```
CSV File
  ↓ import (with source adapter)
data/transactions.json (normalized)
  ↓ categorize (with rules)
data/categorized.json + data/alerts.json
  ↓ export (filter by venture/year)
Schedule C CSV (with allocation fields)
```

## Split Transaction Export

When split allocations are used, the export CSV includes:
- `OriginalTxnId`: Links back to original transaction
- `SplitPercent`: Percentage allocated to this venture
- `OriginalAmount`: Original amount before split

This maintains full audit trail for tax purposes.

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed module boundaries and data flow.

## Testing

```bash
npm test
```

All tests must pass. Coverage includes:
- Parser adapters (generic, Chase, Costco)
- Rules engine (all match types, priority, split validation)
- Categorizer (simple + split allocations)
- Deterministic fixtures for each source type

## Node Version

Requires Node.js 20+ with ESM support.

## License

MIT
