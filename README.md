# Family Office Tracker (v0.1)

Policy-driven transaction categorization + Schedule C-ready exports.

## Quickstart

```bash
npm install
npm test

npm run import -- --file ./samples/sample.csv --source generic
npm run categorize -- --rules ./rules/household.json
npm run export -- --venture dream-vacations --year 2025 --out ./data/dv-2025.csv
npm run report -- --type alerts
```

## Data flow
- import → data/transactions.json
- categorize → data/categorized.json + data/alerts.json
- export → CSV filtered by venture/year
