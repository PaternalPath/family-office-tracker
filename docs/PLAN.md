# Fortune-500 Upgrade Plan

## Current State Audit

### Framework & Versions
- **Web App:** Vite 5.3.1 + React 18.3.1
- **Build Tool:** Vite (fast ESM-based bundler)
- **CLI:** Node.js native ESM
- **Core Package:** Zero external dependencies
- **Monorepo:** npm workspaces at root level
- **Node Version:** Not pinned (needs engines or .nvmrc)

### Current Scripts Status
| Script | Exists | Works | Notes |
|--------|--------|-------|-------|
| `dev` | Yes | Yes | Vite dev server on port 5173 |
| `build` | Yes | Yes | Vite production build to apps/web/dist |
| `test` | Yes | Yes | Node.js native test runner, 25 tests pass |
| `lint` | No | - | Missing - need ESLint |
| `typecheck` | No | - | Missing - JSDoc + TypeScript checker |
| `start` | No | - | Missing - alias for preview |

### Data Storage Approach
- **Current:** In-memory only (web) / JSON files (CLI)
- **Problem:** Data lost on page refresh, no persistence
- **Solution:** Add localStorage with versioned schema

### Gaps vs Acceptance Criteria

| Requirement | Status | Gap |
|-------------|--------|-----|
| `npm ci` works | Yes | - |
| `npm run lint` works | No | Need ESLint + config |
| `npm run typecheck` works | No | Need TypeScript JSDoc checking |
| `npm test` works | Yes | But need more coverage |
| `npm run build` works | Yes | - |
| Zero secrets for Vercel | Yes | Already local-first |
| .env.example documented | No | Need to create |
| Sample CSV in repo | Yes | samples/sample.csv exists |
| "Load sample data" button | No | Need UI button |
| Row-level validation errors | Partial | Need Zod + per-row errors |
| Rules explainability ("Why?") | Partial | Audit trail exists, need UI |
| Monthly summary dashboard | No | Only venture totals exist |
| Export categorized CSV | Yes | Works |
| Empty/loading/error states | Partial | Need polish |
| Mobile-first layout | Partial | Need responsive improvements |
| Accessible controls | Partial | Need ARIA labels, focus states |
| README with screenshots | Partial | Need screenshot/GIF above fold |
| docs/architecture.md | Yes | Already exists |
| GitHub Actions CI | No | Need to create |

---

## Task Breakdown

### Task 1: Standardize Scripts & Tooling
**Goal:** All verification commands work from clean machine

- [ ] Add ESLint with flat config (eslint.config.js)
- [ ] Add Prettier for consistent formatting
- [ ] Add `lint` script to root package.json
- [ ] Add `typecheck` script using tsc --noEmit with JSDoc
- [ ] Add `start` script as alias for preview
- [ ] Pin Node version via .nvmrc (Node 20 LTS)
- [ ] Add engines.node to package.json
- [ ] Fix any existing lint/type errors

**Commit:** `chore: add eslint, prettier, and typecheck scripts`

---

### Task 2: Data Model & Zod Validation
**Goal:** Type-safe validation with clear per-row errors

- [ ] Add Zod dependency (single new dependency)
- [ ] Create schemas:
  - Transaction (normalized shape)
  - ImportError (row-level)
  - CategoryRule
  - MonthlySummary
- [ ] Refactor CSV parsing to use Zod validation
- [ ] Return both valid transactions and row-level errors
- [ ] Surface errors in UI without crashing

**Commit:** `feat: add Zod schemas and row-level validation`

---

### Task 3: localStorage Persistence
**Goal:** Data persists across page refreshes

- [ ] Implement versioned storage schema (v1)
- [ ] Store: transactions, rules, categorized results
- [ ] Add migration path for schema upgrades
- [ ] Add "Clear data" button for reset
- [ ] Auto-save on changes

**Commit:** `feat: add localStorage persistence with versioning`

---

### Task 4: Rules Engine UI Improvements
**Goal:** Editable rules with explanations

- [ ] Add rule CRUD in UI (add/edit/delete)
- [ ] Add rule priority ordering (up/down)
- [ ] Show "Why?" explanation for each categorized transaction
- [ ] Ensure "Uncategorized" default category
- [ ] Add "Load sample rules" button

**Commit:** `feat: add rules management UI with explanations`

---

### Task 5: Dashboard & UX Polish
**Goal:** Professional, mobile-first, accessible UI

Screens:
- [ ] Import: Upload CSV, show validation results, proceed with valid rows
- [ ] Transactions: Table with search/filters, inline category edit, chips
- [ ] Rules: Add/edit/delete, priority ordering
- [ ] Summary: Monthly totals, spend by category

UX:
- [ ] Add proper empty state (first-run experience)
- [ ] Add loading states with spinners
- [ ] Add error boundaries
- [ ] Mobile-responsive tables (stacked rows)
- [ ] Clear CTA hierarchy

Accessibility:
- [ ] Add ARIA labels to all form controls
- [ ] Add visible focus states (focus-visible)
- [ ] Ensure keyboard navigability
- [ ] Add skip links

**Commit:** `feat: polish dashboard with monthly summary and mobile UX`

---

### Task 6: Testing
**Goal:** Meaningful test coverage

Unit tests (Vitest):
- [ ] CSV parsing + header mapping edge cases
- [ ] Zod validation behavior
- [ ] Categorization rule matching + explanation
- [ ] Monthly summary aggregation
- [ ] localStorage read/write

Playwright smoke tests:
- [ ] App loads without errors
- [ ] Load sample CSV works
- [ ] Summary shows expected totals
- [ ] Transactions filter/search works

**Commit:** `test: add comprehensive unit and e2e tests`

---

### Task 7: CI/CD & Documentation
**Goal:** Automated verification, professional docs

CI:
- [ ] Add .github/workflows/ci.yml
- [ ] Trigger on push and pull_request
- [ ] Steps: npm ci, lint, typecheck, test, build

Docs:
- [ ] Add screenshot/GIF to README above fold
- [ ] Add quickstart (5 commands max)
- [ ] Add "Load sample data" instructions
- [ ] Add CSV format guidance
- [ ] Add privacy note (local-first)
- [ ] Add Vercel deploy instructions
- [ ] Create .env.example (even if empty)

**Commit:** `docs: add CI workflow and polish README`

---

## Architecture Decisions

### Why localStorage over IndexedDB?
- Simpler API for small datasets (< 5MB)
- Synchronous access (no async complexity)
- Good browser support
- Sufficient for household finance tracking
- Can migrate to IndexedDB later if needed

### Why Zod?
- Excellent TypeScript integration
- Clear error messages
- Composable schemas
- Small bundle size (~3KB gzipped)
- Industry standard for validation

### Why no backend?
- Privacy: Financial data stays on device
- Simplicity: No auth, no CORS, no servers
- Cost: Zero hosting costs for users
- Speed: Instant operations, no latency

---

## Success Criteria Checklist

```bash
# All must pass from clean clone:
npm ci           # Clean install
npm run lint     # Zero errors
npm run typecheck # Zero errors
npm test         # All tests pass
npm run build    # Builds successfully

# Manual verification:
# 1. Open built app
# 2. Load sample data (one click)
# 3. See transactions with validation
# 4. See monthly summary
# 5. Edit a rule
# 6. See "Why?" explanation
# 7. Export CSV
# 8. Refresh page - data persists
# 9. Works on mobile viewport
```

---

## Timeline Estimate

| Task | Complexity |
|------|------------|
| Task 1: Tooling | Low |
| Task 2: Zod schemas | Medium |
| Task 3: localStorage | Medium |
| Task 4: Rules UI | Medium |
| Task 5: Dashboard | High |
| Task 6: Tests | Medium |
| Task 7: CI/Docs | Low |

---

## Future Work (Post-MVP)

1. **IndexedDB migration** - For larger datasets
2. **Receipt upload** - Link receipts to transactions
3. **Bank API integration** - Plaid or similar
4. **Multi-user sync** - Optional cloud backup
5. **Dark mode** - CSS variables already support it
