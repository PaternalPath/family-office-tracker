import { useState } from 'react'
import {
  parseCsvString,
  validateRulesFile,
  categorizeTransactions,
  exportScheduleC,
  generateAlerts,
  generateSummary
} from '@family-office-tracker/core'

import UploadSection from './components/UploadSection'
import RulesSection from './components/RulesSection'
import Dashboard from './components/Dashboard'
import TransactionsView from './components/TransactionsView'
import LoadingSkeleton from './components/ui/LoadingSkeleton'
import EmptyState from './components/ui/EmptyState'

function App() {
  // CSV state
  const [csvFile, setCsvFile] = useState(null)
  const [csvSource, setCsvSource] = useState('generic')
  const [transactions, setTransactions] = useState(null)
  const [parseError, setParseError] = useState(null)

  // Rules state
  const [rulesFile, setRulesFile] = useState(null)
  const [rulesJson, setRulesJson] = useState('')
  const [rulesError, setRulesError] = useState(null)

  // Results state
  const [categorized, setCategorized] = useState(null)
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // View state
  const [activeView, setActiveView] = useState('setup')

  // Handle CSV upload
  const handleCsvUpload = async (file, source) => {
    setCsvFile(file)
    setCsvSource(source)
    setParseError(null)

    try {
      const text = await file.text()
      const parsed = parseCsvString(text, { source })
      setTransactions(parsed)
    } catch (err) {
      setParseError(err.message)
      setTransactions(null)
    }
  }

  // Handle rules input
  const handleRulesChange = (jsonText) => {
    setRulesJson(jsonText)
    setRulesError(null)

    if (!jsonText.trim()) {
      setRulesFile(null)
      return
    }

    try {
      const parsed = JSON.parse(jsonText)
      validateRulesFile(parsed)
      setRulesFile(parsed)
    } catch (err) {
      setRulesError(err.message)
      setRulesFile(null)
    }
  }

  // Run categorization
  const handleRunCategorization = () => {
    if (!transactions || !rulesFile) return

    setIsProcessing(true)

    try {
      // Categorize transactions
      const result = categorizeTransactions(transactions, rulesFile)
      setCategorized(result.categorized)

      // Generate summary
      const summaryData = generateSummary(result.categorized)
      setSummary(summaryData)

      // Generate alerts
      const alertsData = generateAlerts(result.categorized)
      setAlerts(alertsData)

      // Switch to dashboard view
      setActiveView('dashboard')
    } catch (err) {
      setRulesError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Download JSON
  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download CSV
  const downloadCsv = (csvString, filename) => {
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export Schedule C
  const handleExportScheduleC = (venture, year) => {
    if (!categorized) return

    const { csv } = exportScheduleC(categorized, { venture, year })
    downloadCsv(csv, `export-${venture}-${year}.csv`)
  }

  const canRunCategorization = transactions && transactions.length > 0 && rulesFile

  return (
    <>
      <div className="header">
        <div className="container header-content">
          <h1>Family Office Tracker</h1>
          <span className="header-note">🔒 Local-only processing</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      {categorized && (
        <div style={{ background: 'white', borderBottom: '1px solid var(--gray-200)' }}>
          <div className="container">
            <div style={{ display: 'flex', gap: '8px', padding: '0' }}>
              <button
                onClick={() => setActiveView('dashboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '16px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeView === 'dashboard' ? 'var(--blue-500)' : 'var(--gray-600)',
                  borderBottom: activeView === 'dashboard' ? '2px solid var(--blue-500)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveView('transactions')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '16px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeView === 'transactions' ? 'var(--blue-500)' : 'var(--gray-600)',
                  borderBottom: activeView === 'transactions' ? '2px solid var(--blue-500)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                💳 Transactions
              </button>
              <button
                onClick={() => setActiveView('setup')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '16px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeView === 'setup' ? 'var(--blue-500)' : 'var(--gray-600)',
                  borderBottom: activeView === 'setup' ? '2px solid var(--blue-500)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ⚙️ Setup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        {/* Setup View */}
        {activeView === 'setup' && (
          <>
            {/* Section 1: Upload CSV */}
            <UploadSection
              csvFile={csvFile}
              csvSource={csvSource}
              transactions={transactions}
              parseError={parseError}
              onUpload={handleCsvUpload}
            />

            {/* Section 2: Rules */}
            <RulesSection
              rulesJson={rulesJson}
              rulesFile={rulesFile}
              rulesError={rulesError}
              onRulesChange={handleRulesChange}
            />

            {/* Section 3: Run Categorization */}
            {transactions && transactions.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Run Categorization</div>
                    <div className="card-subtitle">
                      Process {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    className="button button-primary"
                    onClick={handleRunCategorization}
                    disabled={!canRunCategorization || isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Run Categorization'}
                  </button>
                </div>

                {!rulesFile && !rulesError && (
                  <div className="alert alert-info">
                    Upload or paste rules JSON above to enable categorization.
                  </div>
                )}

                {isProcessing && (
                  <div>
                    <LoadingSkeleton count={3} height={60} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Dashboard View */}
        {activeView === 'dashboard' && categorized && summary && alerts && (
          <Dashboard
            categorized={categorized}
            summary={summary}
            alerts={alerts}
          />
        )}

        {/* Transactions View */}
        {activeView === 'transactions' && categorized && summary && (
          <TransactionsView
            categorized={categorized}
            summary={summary}
            onDownloadJson={downloadJson}
            onExportScheduleC={handleExportScheduleC}
          />
        )}
      </div>
    </>
  )
}

export default App
