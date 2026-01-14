import { useState, useMemo } from 'react'
import Badge from './ui/Badge'
import SearchBar from './ui/SearchBar'
import EmptyState from './ui/EmptyState'

function TransactionsView({ categorized, summary, onDownloadJson, onExportScheduleC }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVenture, setFilterVenture] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false)
  const [scheduleVenture, setScheduleVenture] = useState('')
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear().toString())

  // Get unique ventures and categories
  const ventures = useMemo(() => {
    const ventureSet = new Set(categorized.map(t => t.venture).filter(Boolean))
    return ['all', ...Array.from(ventureSet).sort()]
  }, [categorized])

  const categories = useMemo(() => {
    const categorySet = new Set(categorized.map(t => t.category).filter(Boolean))
    return ['all', ...Array.from(categorySet).sort()]
  }, [categorized])

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    return categorized.filter(t => {
      // Venture filter
      if (filterVenture !== 'all' && t.venture !== filterVenture) return false

      // Category filter
      if (filterCategory !== 'all' && t.category !== filterCategory) return false

      // Uncategorized only filter
      if (showUncategorizedOnly && t.category !== 'Uncategorized') return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesDescription = t.description?.toLowerCase().includes(query)
        const matchesCategory = t.category?.toLowerCase().includes(query)
        const matchesVenture = t.venture?.toLowerCase().includes(query)
        const matchesAmount = t.amount?.toString().includes(query)

        return matchesDescription || matchesCategory || matchesVenture || matchesAmount
      }

      return true
    })
  }, [categorized, filterVenture, filterCategory, showUncategorizedOnly, searchQuery])

  const formatAmount = (amount) => {
    const formatted = Math.abs(amount).toFixed(2)
    return amount < 0 ? `-$${formatted}` : `$${formatted}`
  }

  const getCategoryVariant = (category) => {
    if (category === 'Uncategorized') return 'uncategorized'
    return 'default'
  }

  if (!categorized || categorized.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No Transactions"
        description="Upload a CSV file and run categorization to see your transactions here."
      />
    )
  }

  return (
    <div>
      {/* Filters and Search */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
          />
        </div>

        <div className="filters">
          <div className="filter-group">
            <label className="label">Venture</label>
            <select
              className="select"
              value={filterVenture}
              onChange={(e) => setFilterVenture(e.target.value)}
            >
              {ventures.map(v => (
                <option key={v} value={v}>
                  {v === 'all' ? 'All Ventures' : v}
                </option>
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
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="label">Show</label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 0',
                cursor: 'pointer'
              }}
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--gray-200)'
          }}
        >
          <div className="text-sm text-muted">
            Showing {filteredTransactions.length} of {categorized.length} transactions
          </div>
          {searchQuery && (
            <button
              className="button button-sm button-secondary"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">All Transactions</div>
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No Matching Transactions"
            description="Try adjusting your filters or search query."
            action={
              <button
                className="button button-primary"
                onClick={() => {
                  setSearchQuery('')
                  setFilterVenture('all')
                  setFilterCategory('all')
                  setShowUncategorizedOnly(false)
                }}
              >
                Clear All Filters
              </button>
            }
          />
        ) : (
          <>
            <div className="table-container" style={{ maxHeight: '600px', overflow: 'auto' }}>
              <table>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Category</th>
                    <th>Venture</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn, idx) => (
                    <tr key={idx}>
                      <td style={{ whiteSpace: 'nowrap' }}>{txn.date}</td>
                      <td>
                        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {txn.description}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          color: txn.amount < 0 ? 'var(--red-500)' : 'var(--green-500)'
                        }}
                      >
                        {formatAmount(txn.amount)}
                      </td>
                      <td>
                        <Badge variant={getCategoryVariant(txn.category)}>
                          {txn.category}
                        </Badge>
                      </td>
                      <td className="text-sm text-muted">{txn.venture || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTransactions.length > 50 && (
              <div className="alert alert-info" style={{ marginTop: '16px' }}>
                💡 <strong>Tip:</strong> Showing all {filteredTransactions.length} transactions.
                Use filters or download the full dataset for analysis.
              </div>
            )}
          </>
        )}
      </div>

      {/* Export Section */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div className="card-title">Export Data</div>
        </div>

        <div className="flex gap-4" style={{ marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            className="button button-secondary"
            onClick={() => onDownloadJson(categorized, 'categorized.json')}
          >
            📥 Download JSON
          </button>
          <button
            className="button button-secondary"
            onClick={() => onDownloadJson(filteredTransactions, 'filtered-transactions.json')}
            disabled={filteredTransactions.length === 0}
          >
            📥 Download Filtered ({filteredTransactions.length})
          </button>
        </div>

        <div>
          <label className="label">Schedule C Export</label>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <select
              className="select"
              value={scheduleVenture}
              onChange={(e) => setScheduleVenture(e.target.value)}
              style={{ flex: '2', minWidth: '200px' }}
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
              style={{ flex: '1', minWidth: '100px' }}
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
    </div>
  )
}

export default TransactionsView
