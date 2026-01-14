import { useMemo } from 'react'
import Badge from './ui/Badge'

function Dashboard({ categorized, summary, alerts }) {
  // Calculate financial metrics
  const metrics = useMemo(() => {
    if (!categorized || categorized.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        avgTransaction: 0,
        categorizedPercent: 0
      }
    }

    const income = categorized
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = categorized
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const netCashFlow = income - expenses
    const avgTransaction = categorized.reduce((sum, t) => sum + Math.abs(t.amount), 0) / categorized.length
    const categorizedPercent = ((summary.totalTransactions - summary.uncategorizedCount) / summary.totalTransactions) * 100

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netCashFlow,
      avgTransaction,
      categorizedPercent
    }
  }, [categorized, summary])

  // Top categories by spending
  const topCategories = useMemo(() => {
    if (!categorized) return []

    const categoryTotals = {}
    categorized
      .filter(t => t.amount < 0 && t.category !== 'Uncategorized')
      .forEach(t => {
        if (!categoryTotals[t.category]) {
          categoryTotals[t.category] = 0
        }
        categoryTotals[t.category] += Math.abs(t.amount)
      })

    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [categorized])

  // Recent activity
  const recentActivity = useMemo(() => {
    if (!categorized) return []
    return [...categorized]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
  }, [categorized])

  const formatAmount = (amount) => {
    return `$${Math.abs(amount).toFixed(2)}`
  }

  const formatPercent = (percent) => {
    return `${percent.toFixed(1)}%`
  }

  return (
    <div>
      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Income</div>
          <div className="stat-value success">{formatAmount(metrics.totalIncome)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value danger">{formatAmount(metrics.totalExpenses)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Net Cash Flow</div>
          <div
            className="stat-value"
            style={{ color: metrics.netCashFlow >= 0 ? 'var(--green-500)' : 'var(--red-500)' }}
          >
            {metrics.netCashFlow >= 0 ? '+' : '-'}{formatAmount(metrics.netCashFlow)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Categorized</div>
          <div className="stat-value">{formatPercent(metrics.categorizedPercent)}</div>
          <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
            {summary.totalTransactions - summary.uncategorizedCount} of {summary.totalTransactions} transactions
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts && alerts.uncategorizedCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <strong>⚠️ Action Required:</strong> {alerts.uncategorizedCount} uncategorized transaction
          {alerts.uncategorizedCount !== 1 ? 's' : ''} need{alerts.uncategorizedCount === 1 ? 's' : ''} attention.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Top Spending Categories */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Spending Categories</div>
          </div>
          {topCategories.length > 0 ? (
            <div>
              {topCategories.map(([category, total]) => (
                <div
                  key={category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--gray-100)'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{category}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {formatAmount(total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No categorized expenses yet.</p>
          )}
        </div>

        {/* Venture Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Spending by Venture</div>
          </div>
          {Object.keys(summary.byVenture).length > 0 ? (
            <div>
              {Object.entries(summary.byVenture)
                .sort((a, b) => a[1] - b[1])
                .map(([venture, total]) => (
                  <div
                    key={venture}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--gray-100)'
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{venture}</span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: total < 0 ? 'var(--red-500)' : 'var(--green-500)'
                      }}
                    >
                      {total < 0 ? '-' : '+'}{formatAmount(total)}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No venture data available.</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Activity</div>
        </div>
        {recentActivity.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((txn, idx) => (
                  <tr key={idx}>
                    <td style={{ whiteSpace: 'nowrap' }}>{txn.date}</td>
                    <td>{txn.description}</td>
                    <td>
                      <Badge variant={txn.category === 'Uncategorized' ? 'uncategorized' : 'default'}>
                        {txn.category}
                      </Badge>
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        color: txn.amount < 0 ? 'var(--red-500)' : 'var(--green-500)'
                      }}
                    >
                      {txn.amount < 0 ? '-' : '+'}{formatAmount(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No transactions yet.</p>
        )}
      </div>

      {/* Top Uncategorized */}
      {summary.topUncategorized && summary.topUncategorized.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <div className="card-title">Uncategorized Merchants</div>
            <Badge variant="warning">{summary.topUncategorized.length}</Badge>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th style={{ textAlign: 'center' }}>Transactions</th>
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
  )
}

export default Dashboard
