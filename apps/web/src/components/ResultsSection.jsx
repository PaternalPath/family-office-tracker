import { useState, useMemo } from 'react'

function ResultsSection({ categorized, summary, alerts, onDownloadJson, onExportScheduleC }) {
  const [filterVenture, setFilterVenture] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false)
  const [scheduleVenture, setScheduleVenture] = useState('')
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear().toString())

  // Get unique ventures and categories
  const ventures = useMemo(() => {
    const ventureSet = new Set(categorized.map(t => t.venture))
    return ['all', ...Array.from(ventureSet).sort()]
  }, [categorized])

  const categories = useMemo(() => {
    const categorySet = new Set(categorized.map(t => t.category))
    return ['all', ...Array.from(categorySet).sort()]
  }, [categorized])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return categorized.filter(t => {
      if (filterVenture !== 'all' && t.venture !== filterVenture) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (showUncategorizedOnly && t.category !== 'Uncategorized') return false
      return true
    })
  }, [categorized, filterVenture, filterCategory, showUncategorizedOnly])

  const formatAmount = (amount) => {
    const formatted = Math.abs(amount).toFixed(2)
    return amount < 0 ? `-$${formatted}` : `$${formatted}`
  }

  return (
    <>
      {/* Summary Stats */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Results Summary</div>
        </div>

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
            <div className="stat-label">Alerts</div>
            <div className="stat-value danger">{alerts.uncategorizedCount}</div>
          </div>
        </div>

        {/* Venture Totals */}
        {Object.keys(summary.byVenture).length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm" style={{ fontWeight: 600, marginBottom: '12px' }}>
              Totals by Venture
            </h3>
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
            <h3 className="text-sm" style={{ fontWeight: 600, marginBottom: '12px' }}>
              Top Uncategorized Merchants
            </h3>
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
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            Transactions Preview
            <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: '8px' }}>
              ({filteredTransactions.length} shown)
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label className="label">Venture</label>
            <select
              className="select"
              value={filterVenture}
              onChange={(e) => setFilterVenture(e.target.value)}
            >
              {ventures.map(v => (
                <option key={v} value={v}>{v === 'all' ? 'All Ventures' : v}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="label">Category</label>
            <select
              className="select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="label">Show</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
              <input
                type="checkbox"
                checked={showUncategorizedOnly}
                onChange={(e) => setShowUncategorizedOnly(e.target.checked)}
              />
              <span className="text-sm">Uncategorized only</span>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Venture</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.slice(0, 50).map((txn, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: 'nowrap' }}>{txn.date}</td>
                  <td>{txn.description}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {formatAmount(txn.amount)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: txn.category === 'Uncategorized' ? 'var(--orange-500)' : 'var(--gray-100)',
                        color: txn.category === 'Uncategorized' ? 'white' : 'var(--gray-700)'
                      }}
                    >
                      {txn.category}
                    </span>
                  </td>
                  <td>{txn.venture}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length > 50 && (
          <div className="alert alert-info" style={{ marginTop: '16px' }}>
            Showing first 50 of {filteredTransactions.length} transactions. Download full data below.
          </div>
        )}
      </div>

      {/* Exports */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Export Data</div>
        </div>

        <div className="flex gap-4" style={{ marginBottom: '24px' }}>
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

        <div>
          <label className="label">Schedule C Export</label>
          <div className="flex gap-2">
            <select
              className="select"
              value={scheduleVenture}
              onChange={(e) => setScheduleVenture(e.target.value)}
              style={{ flex: '2' }}
            >
              <option value="">Select Venture...</option>
              {ventures.filter(v => v !== 'all').map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <input
              type="number"
              className="input"
              value={scheduleYear}
              onChange={(e) => setScheduleYear(e.target.value)}
              placeholder="Year"
              style={{ flex: '1' }}
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
      </div>
    </>
  )
}

export default ResultsSection
