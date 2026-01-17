# Family Office Tracker

**Privacy-first expense categorization for small business owners.** Import bank CSVs, auto-categorize transactions with custom rules, and export Schedule C-ready reports. Your data never leaves your browser.

[![CI](https://github.com/PaternalPath/family-office-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/PaternalPath/family-office-tracker/actions/workflows/ci.yml)

---

## Quickstart

```bash
git clone https://github.com/PaternalPath/family-office-tracker.git
cd family-office-tracker
npm install
npm run dev
# Open http://localhost:5173
```

**Try the demo:** Click "Load Sample Data" to see the app in action with example transactions.

---

## Features

- **CSV Import with Validation** - Drag-and-drop upload with row-level error reporting
- **Rule-Based Categorization** - Define custom rules with keyword matching, regex, amount ranges
- **Explainable Results** - Click "Why?" on any transaction to see which rule matched
- **Monthly Summary Dashboard** - Track spending trends by category and venture
- **Schedule C Export** - Download categorized transactions as CSV
- **Local-First Privacy** - 100% client-side, data stored in localStorage
- **Mobile-Responsive** - Works on any device

---

## CSV Format

The app accepts standard CSV exports from most banks. Required columns:

| Column | Accepted Headers |
|--------|------------------|
| Date | `Date`, `Transaction Date`, `Posting Date` |
| Description | `Description`, `Merchant`, `Transaction Description` |
| Amount | `Amount`, `Debit`, `Charge`, `Transaction Amount` |

**Example CSV:**
```csv
Date,Description,Amount
2025-01-15,COSTCO WHOLESALE,-142.18
2025-01-16,OPENAI *CHATGPT,-20.00
2025-01-20,UNITED AIRLINES,-450.00
```

Dates can be in `YYYY-MM-DD`, `MM/DD/YYYY`, or `M/D/YY` format.

---

## Rules Format

Rules are defined in JSON with flexible matching conditions:

```json
{
  "ventures": ["consulting", "personal", "travel"],
  "rules": [
    {
      "id": "ai-tools",
      "priority": 100,
      "when": { "any_contains": ["OPENAI", "ANTHROPIC", "CHATGPT"] },
      "then": {
        "category": "Software",
        "venture": "consulting",
        "requiresReceipt": false,
        "note": "AI tools for business"
      }
    }
  ]
}
```

**Matching conditions:**
- `any_contains` - Match if description contains ANY keyword
- `all_contains` - Match if description contains ALL keywords
- `regex` - Match with regular expression
- `amount_gt`, `amount_lt` - Compare transaction amount
- `amount_between` - Amount within range

Rules are processed by priority (highest first).

---

## Deploy to Vercel

**One-click deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PaternalPath/family-office-tracker)

**Manual deploy:**
```bash
npm install
npm run build
# Deploy apps/web/dist to Vercel, Netlify, or any static host
```

No environment variables required. Zero backend dependencies.

---

## Development

```bash
# Install dependencies
npm install

# Run dev server with hot reload
npm run dev

# Run all checks
npm run lint
npm run typecheck
npm run test:unit

# Run e2e tests (requires Playwright)
npx playwright install chromium
npm run test:e2e

# Production build
npm run build
```

**Project structure:**
```
family-office-tracker/
├── apps/web/          # React web app (Vite)
├── apps/cli/          # Node.js CLI tool
├── packages/core/     # Shared business logic
├── tests/             # Unit and e2e tests
└── docs/              # Architecture docs
```

---

## CLI Usage

For batch processing, use the Node.js CLI:

```bash
# Import transactions
npm run import -- --file bank.csv --source generic

# Categorize with rules
npm run categorize -- --rules rules/household.json --strict

# Export for Schedule C
npm run export -- --venture consulting --year 2025
```

See [CLI documentation](#commands) below for all options.

---

## Privacy

**Your data stays on your device.** This app:
- Stores all data in browser localStorage
- Never sends data to any server
- Works completely offline after initial load
- Has zero analytics or tracking

To clear all data, click "Clear Data" or run `localStorage.clear()` in the browser console.

---

## Commands

### `import` - Import CSV transactions

```bash
npm run import -- --file <path> [--source <type>] [--out-dir <dir>]
```

Options:
- `--file <path>`: CSV file to import (required)
- `--source <type>`: Source type - `generic`, `chase`, `costco` (default: `generic`)
- `--out-dir <dir>`: Output directory (default: `./data`)

### `categorize` - Categorize transactions

```bash
npm run categorize -- [--rules <path>] [--strict] [--out-dir <dir>]
```

Options:
- `--rules <path>`: Rules file (default: `rules/household.json`)
- `--strict`: Exit with error if uncategorized transactions exist
- `--out-dir <dir>`: Output directory (default: `./data`)

### `export` - Export for Schedule C

```bash
npm run export -- --venture <name> --year <year> [--out <file>]
```

Options:
- `--venture <name>`: Venture to export (required)
- `--year <year>`: Year to export (required)
- `--out <file>`: Output CSV file (optional)

### `report` - Generate reports

```bash
npm run report -- [--type <type>] [--out-dir <dir>]
```

Options:
- `--type <type>`: Report type - `summary`, `alerts` (default: `summary`)

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for module boundaries and data flow.

**Tech stack:**
- Vite 5 + React 18
- Zod for runtime validation
- Node.js 20+ native test runner
- Playwright for e2e testing
- ESLint 9 flat config
- TypeScript (JSDoc type checking)

---

## License

MIT
