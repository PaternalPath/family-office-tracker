import { useState, useMemo } from 'react'

function ResultsSection({ categorized, summary, alerts, onDownloadJson, onExportScheduleC }) {
  const [activeTab, setActiveTab] = useState('summary')
  const [filterVenture, setFilterVenture] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [scheduleVenture, setScheduleVenture] = useState('')
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear().toString())

  // Get unique ventures and categories
  const ventures = useMemo(() => {
    const ventureSet = new Set(categorized.map((t) => t.venture))
    return ['all', ...Array.from(ventureSet).sort()]
  }, [categorized])

  const categories = useMemo(() => {
    const categorySet = new Set(categorized.map((t) => t.category))
    return ['all', ...Array.from(categorySet).sort()]
  }, [categorized])

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const byMonth = {}

    categorized.forEach((txn) => {
      const month = txn.date.substring(0, 7) // YYYY-MM
      if (!byMonth[month]) {
        byMonth[month] = { total: 0, count: 0, byCategory: {} }
      }
      byMonth[month].total += txn.amount
      byMonth[month].count++

      if (!byMonth[month].byCategory[txn.category]) {
        byMonth[month].byCategory[txn.category] = 0
      }
      byMonth[month].byCategory[txn.category] += txn.amount
    })

    return Object.entries(byMonth)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({
        month,
        ...data
      }))
  }, [categorized])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return categorized.filter((t) => {
      if (filterVenture !== 'all' && t.venture !== filterVenture) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (showUncategorizedOnly && t.category !== 'Uncategorized') return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.venture.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [categorized, filterVenture, filterCategory, showUncategorizedOnly, searchQuery])

  const formatAmount = (amount) => {
    const formatted = Math.abs(amount).toFixed(2)
    return amount < 0 ? `-$${formatted}` : `$${formatted}`
  }

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(year, parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const getExplanation = (txn) => {
    if (!txn.audit || txn.audit.length === 0) {
      return 'No categorization information available'
    }

    const audit = txn.audit[0]

    if (audit.step === 'no_match') {
      return 'No matching rule found - marked as Uncategorized'
    }

    if (audit.step === 'matched_rule' || audit.step === 'split_allocation') {
      const conditions = []
      if (audit.when) {
        if (audit.when.any_contains || audit.when.contains) {
          const keywords = audit.when.any_contains || audit.when.contains
          conditions.push(`contains: "${keywords.join('" or "')}"`)
        }
        if (audit.when.all_contains) {
          conditions.push(`all of: "${audit.when.all_contains.join('", "')}"`)
        }
        if (audit.when.regex) {
          const pattern =
            typeof audit.when.regex === 'string' ? audit.when.regex : audit.when.regex.pattern
          conditions.push(`regex: ${pattern}`)
        }
        if (audit.when.amount_gt !== undefined) {
          conditions.push(`amount > ${audit.when.amount_gt}`)
        }
        if (audit.when.amount_lt !== undefined) {
          conditions.push(`amount < ${audit.when.amount_lt}`)
        }
        if (audit.when.amount_between) {
          conditions.push(
            `amount between ${audit.when.amount_between.min} and ${audit.when.amount_between.max}`
          )
        }
      }

      let explanation = `Matched rule "${audit.ruleId}"`
      if (conditions.length > 0) {
        explanation += ` because ${conditions.join(' AND ')}`
      }

      if (audit.step === 'split_allocation' && audit.allocation) {
        explanation += ` (${audit.allocation.percent}% allocated to ${audit.allocation.venture})`
      }

      return explanation
    }

    return 'Unknown categorization step'
  }

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'export', label: 'Export' }
  ]

  return (
    <>
      {/* Tab Navigation */}
      <nav className="tabs" role="tablist" aria-label="Results sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <section
          id="panel-summary"
          role="tabpanel"
          aria-labelledby="tab-summary"
          className="card"
        >
          <h2 className="card-title" style={{ marginBottom: '24px' }}>
            Results Summary
          </h2>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{summary.totalTransactions}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Categorized</div>
              <div className="stat-value success">
                {summary.totalTransactions - summary.uncategorizedCount}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Uncategorized</div>
              <div className="stat-value warning">{summary.uncategorizedCount}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Need Receipt</div>
              <div className="stat-value danger">{alerts?.uncategorizedCount || 0}</div>
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(summary.byCategory).length > 0 && (
            <div className="mb-4">
              <h3 className="section-title">Spend by Category</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byCategory)
                      .sort((a, b) => a[1] - b[1])
                      .map(([category, total]) => (
                        <tr key={category}>
                          <td>
                            <span className={`category-chip ${category === 'Uncategorized' ? 'uncategorized' : ''}`}>
                              {category}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            {formatAmount(total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Venture Totals */}
          {Object.keys(summary.byVenture).length > 0 && (
            <div className="mb-4">
              <h3 className="section-title">Totals by Venture</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Venture</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byVenture)
                      .sort((a, b) => a[1] - b[1])
                      .map(([venture, total]) => (
                        <tr key={venture}>
                          <td>{venture}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            {formatAmount(total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Uncategorized */}
          {summary.topUncategorized.length > 0 && (
            <div>
              <h3 className="section-title">Top Uncategorized Merchants</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th style={{ textAlign: 'center' }}>Count</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topUncategorized.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.merchant}</td>
                        <td style={{ textAlign: 'center' }}>{item.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {formatAmount(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Monthly Tab */}
      {activeTab === 'monthly' && (
        <section
          id="panel-monthly"
          role="tabpanel"
          aria-labelledby="tab-monthly"
          className="card"
        >
          <h2 className="card-title" style={{ marginBottom: '24px' }}>
            Monthly Summary
          </h2>

          {monthlySummary.length === 0 ? (
            <p className="text-muted">No transactions to display.</p>
          ) : (
            <div className="monthly-grid">
              {monthlySummary.map((month) => (
                <div key={month.month} className="monthly-card">
                  <div className="monthly-header">
                    <h3 className="monthly-title">{formatMonth(month.month)}</h3>
                    <div className="monthly-total">{formatAmount(month.total)}</div>
                  </div>
                  <div className="monthly-meta">
                    {month.count} transaction{month.count !== 1 ? 's' : ''}
                  </div>
                  <div className="monthly-categories">
                    {Object.entries(month.byCategory)
                      .sort((a, b) => a[1] - b[1])
                      .slice(0, 5)
                      .map(([cat, amt]) => (
                        <div key={cat} className="monthly-category-row">
                          <span className={`category-chip ${cat === 'Uncategorized' ? 'uncategorized' : ''}`}>
                            {cat}
                          </span>
                          <span className="monthly-category-amount">{formatAmount(amt)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <section
          id="panel-transactions"
          role="tabpanel"
          aria-labelledby="tab-transactions"
          className="card"
        >
          <div className="card-header">
            <h2 className="card-title">
              Transactions
              <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: '8px' }}>
                ({filteredTransactions.length} shown)
              </span>
            </h2>
          </div>

          {/* Search and Filters */}
          <div className="filters">
            <div className="filter-group" style={{ flex: 2 }}>
              <label htmlFor="search-transactions" className="label">
                Search
              </label>
              <input
                id="search-transactions"
                type="text"
                className="input"
                placeholder="Search description, category, or venture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filter-venture" className="label">
                Venture
              </label>
              <select
                id="filter-venture"
                className="select"
                value={filterVenture}
                onChange={(e) => setFilterVenture(e.target.value)}
              >
                {ventures.map((v) => (
                  <option key={v} value={v}>
                    {v === 'all' ? 'All Ventures' : v}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-category" className="label">
                Category
              </label>
              <select
                id="filter-category"
                className="select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="label">Filter</label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}
              >
                <input
                  type="checkbox"
                  checked={showUncategorizedOnly}
                  onChange={(e) => setShowUncategorizedOnly(e.target.checked)}
                />
                <span className="text-sm">Uncategorized only</span>
              </label>
            </div>
          </div>

          {/* Transaction List */}
          <div className="transaction-list">
            {filteredTransactions.slice(0, 50).map((txn, idx) => (
              <div key={txn.id || idx} className="transaction-row">
                <div className="transaction-main">
                  <div className="transaction-info">
                    <span className="transaction-date">{txn.date}</span>
                    <span className="transaction-description">{txn.description}</span>
                  </div>
                  <div className="transaction-details">
                    <span
                      className={`category-chip ${txn.category === 'Uncategorized' ? 'uncategorized' : ''}`}
                    >
                      {txn.category}
                    </span>
                    <span className="transaction-venture">{txn.venture}</span>
                    <span className="transaction-amount">{formatAmount(txn.amount)}</span>
                    <button
                      className="why-button"
                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      aria-expanded={expandedRow === idx}
                      aria-label="Show why this transaction was categorized this way"
                    >
                      Why?
                    </button>
                  </div>
                </div>
                {expandedRow === idx && (
                  <div className="transaction-explanation">
                    <strong>Categorization reason:</strong> {getExplanation(txn)}
                    {txn.note && (
                      <div className="transaction-note">
                        <strong>Note:</strong> {txn.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTransactions.length > 50 && (
            <div className="alert alert-info" style={{ marginTop: '16px' }}>
              Showing first 50 of {filteredTransactions.length} transactions. Download full data
              in the Export tab.
            </div>
          )}

          {filteredTransactions.length === 0 && (
            <div className="empty-results">
              <p className="text-muted">No transactions match your filters.</p>
            </div>
          )}
        </section>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <section
          id="panel-export"
          role="tabpanel"
          aria-labelledby="tab-export"
          className="card"
        >
          <h2 className="card-title" style={{ marginBottom: '24px' }}>
            Export Data
          </h2>

          <div className="export-section">
            <h3 className="section-title">Full Data Export</h3>
            <p className="text-muted text-sm mb-2">
              Download all categorized transactions as JSON for backup or analysis.
            </p>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <button
                className="button button-secondary"
                onClick={() => onDownloadJson(categorized, 'categorized.json')}
              >
                Download categorized.json
              </button>

              <button
                className="button button-secondary"
                onClick={() => onDownloadJson(alerts, 'alerts.json')}
              >
                Download alerts.json
              </button>
            </div>
          </div>

          <div className="export-section" style={{ marginTop: '32px' }}>
            <h3 className="section-title">Schedule C Export</h3>
            <p className="text-muted text-sm mb-2">
              Export transactions for a specific venture and year in CSV format for tax reporting.
            </p>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <select
                className="select"
                value={scheduleVenture}
                onChange={(e) => setScheduleVenture(e.target.value)}
                style={{ flex: '2', minWidth: '150px' }}
                aria-label="Select venture"
              >
                <option value="">Select Venture...</option>
                {ventures
                  .filter((v) => v !== 'all')
                  .map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
              </select>

              <input
                type="number"
                className="input"
                value={scheduleYear}
                onChange={(e) => setScheduleYear(e.target.value)}
                placeholder="Year"
                style={{ flex: '1', minWidth: '100px' }}
                aria-label="Year"
              />

              <button
                className="button button-primary"
                onClick={() => onExportScheduleC(scheduleVenture, scheduleYear)}
                disabled={!scheduleVenture || !scheduleYear}
              >
                Export CSV
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

export default ResultsSection
