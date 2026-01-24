import { useState, useEffect, useCallback } from 'react'
import {
  validateAndParseCsv,
  validateRulesFile,
  categorizeTransactions,
  exportScheduleC,
  generateAlerts,
  generateSummary
} from '@family-office-tracker/core'
import { usePersistedState } from './hooks/usePersistedState.js'
import { exportBackup, importBackup } from './lib/storage.js'

import UploadSection from './components/UploadSection.jsx'
import RulesSection from './components/RulesSection.jsx'
import ResultsSection from './components/ResultsSection.jsx'

// Sample data URLs
const SAMPLE_CSV_URL = '/sample-transactions.csv'
const SAMPLE_RULES_URL = '/sample-rules.json'

function App() {
  // Persisted state (survives page refresh)
  const {
    transactions,
    rulesFile,
    categorized,
    summary,
    setTransactions,
    setRulesFile,
    setCategorization,
    clearData,
    reloadData,
    isLoading,
    hasData
  } = usePersistedState()

  // UI-only state (not persisted)
  const [csvFile, setCsvFile] = useState(null)
  const [csvSource, setCsvSource] = useState('generic')
  const [parseError, setParseError] = useState(null)
  const [parseErrors, setParseErrors] = useState([])
  const [rulesJson, setRulesJson] = useState('')
  const [rulesError, setRulesError] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  // Sync rules JSON with persisted rulesFile
  useEffect(() => {
    if (rulesFile && !rulesJson) {
      setRulesJson(JSON.stringify(rulesFile, null, 2))
    }
  }, [rulesFile, rulesJson])

  // Handle CSV upload
  const handleCsvUpload = useCallback(
    async (file, source) => {
      if (!file) {
        setCsvFile(null)
        setTransactions([])
        setParseError(null)
        setParseErrors([])
        return
      }

      setCsvFile(file)
      setCsvSource(source)
      setParseError(null)
      setParseErrors([])

      try {
        const text = await file.text()
        const result = validateAndParseCsv(text, { source })

        if (result.errors.length > 0 && result.transactions.length === 0) {
          setParseError(result.errors[0].message)
          setParseErrors(result.errors)
          setTransactions([])
        } else {
          setTransactions(result.transactions)
          setParseErrors(result.errors)
        }
      } catch (err) {
        setParseError(err.message)
        setTransactions([])
      }
    },
    [setTransactions]
  )

  // Handle rules input
  const handleRulesChange = useCallback(
    (jsonText) => {
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
    },
    [setRulesFile]
  )

  // Load sample data
  const handleLoadSampleData = useCallback(async () => {
    setLoadingSample(true)
    try {
      // Load sample CSV
      const csvResponse = await fetch(SAMPLE_CSV_URL)
      if (csvResponse.ok) {
        const csvText = await csvResponse.text()
        const result = validateAndParseCsv(csvText, { source: 'generic' })
        setTransactions(result.transactions)
        setParseErrors(result.errors)
        setCsvFile({ name: 'sample-transactions.csv', size: csvText.length })
      }

      // Load sample rules
      const rulesResponse = await fetch(SAMPLE_RULES_URL)
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json()
        setRulesFile(rulesData)
        setRulesJson(JSON.stringify(rulesData, null, 2))
      }
    } catch (err) {
      console.error('Failed to load sample data:', err)
    } finally {
      setLoadingSample(false)
    }
  }, [setTransactions, setRulesFile])

  // Run categorization
  const handleRunCategorization = useCallback(() => {
    if (!transactions || transactions.length === 0 || !rulesFile) return

    setIsProcessing(true)

    try {
      const result = categorizeTransactions(transactions, rulesFile)
      const summaryData = generateSummary(result.categorized)
      const alertsData = generateAlerts(result.categorized)

      setCategorization(result.categorized, summaryData)
      setAlerts(alertsData)
    } catch (err) {
      setRulesError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [transactions, rulesFile, setCategorization])

  // Download helpers
  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCsv = (csvString, filename) => {
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportScheduleC = (venture, year) => {
    if (!categorized) return
    const { csv } = exportScheduleC(categorized, { venture, year })
    downloadCsv(csv, `export-${venture}-${year}.csv`)
  }

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearData()
      setCsvFile(null)
      setRulesJson('')
      setParseError(null)
      setParseErrors([])
      setRulesError(null)
      setAlerts(null)
    }
  }

  // Export backup as JSON file
  const handleExportBackup = () => {
    const backup = exportBackup()
    const blob = new Blob([backup], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family-office-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import backup from JSON file
  const handleImportBackup = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Confirm before overwriting existing data
    if (hasData) {
      const confirmed = window.confirm(
        'This will replace all existing data with the backup. Are you sure you want to continue?'
      )
      if (!confirmed) {
        event.target.value = ''
        return
      }
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = importBackup(e.target?.result)
      if (result.success) {
        reloadData()
        // Sync UI state with restored data
        const data = JSON.parse(e.target?.result)
        if (data.rulesFile) {
          setRulesJson(JSON.stringify(data.rulesFile, null, 2))
        } else {
          setRulesJson('')
        }
        setCsvFile(null)
        setParseError(null)
        setParseErrors([])
        setRulesError(null)
        setAlerts(null)
        window.alert('Backup restored successfully.')
      } else {
        window.alert(`Failed to import backup: ${result.error}`)
      }
    }
    reader.readAsText(file)
    // Reset input so same file can be selected again
    event.target.value = ''
  }

  const canRunCategorization = transactions && transactions.length > 0 && rulesFile

  // Show loading state
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <h1>Family Office Tracker</h1>
          <div className="header-actions">
            <span className="header-note">Local-only processing</span>
            {hasData && (
              <button
                className="button button-sm button-secondary"
                onClick={handleExportBackup}
                aria-label="Export backup"
              >
                Export Backup
              </button>
            )}
            <label className="button button-sm button-secondary file-input-label">
              Import Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="file-input-hidden"
                aria-label="Import backup file"
              />
            </label>
            {hasData && (
              <button
                className="button button-sm button-secondary"
                onClick={handleClearData}
                aria-label="Clear all data"
              >
                Clear Data
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        {/* Empty state for first-time users */}
        {!hasData && transactions.length === 0 && !csvFile && (
          <div className="card empty-state">
            <div className="empty-state-icon">📊</div>
            <h2>Welcome to Family Office Tracker</h2>
            <p className="text-muted">
              Import your bank transactions, set up categorization rules, and get insights into your
              spending.
            </p>
            <div className="empty-state-actions">
              <button
                className="button button-primary"
                onClick={handleLoadSampleData}
                disabled={loadingSample}
              >
                {loadingSample ? 'Loading...' : 'Load Sample Data'}
              </button>
              <span className="text-muted text-sm">or upload your own CSV below</span>
            </div>
          </div>
        )}

        {/* Section 1: Upload CSV */}
        <UploadSection
          csvFile={csvFile}
          csvSource={csvSource}
          transactions={transactions}
          parseError={parseError}
          parseErrors={parseErrors}
          onUpload={handleCsvUpload}
          onLoadSample={handleLoadSampleData}
          loadingSample={loadingSample}
        />

        {/* Section 2: Rules */}
        <RulesSection
          rulesJson={rulesJson}
          rulesFile={rulesFile}
          rulesError={rulesError}
          onRulesChange={handleRulesChange}
        />

        {/* Section 3: Run + Results */}
        {transactions && transactions.length > 0 && (
          <section className="card" aria-labelledby="categorization-title">
            <div className="card-header">
              <div>
                <h2 id="categorization-title" className="card-title">
                  Run Categorization
                </h2>
                <p className="card-subtitle">
                  Process {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                  {parseErrors.length > 0 && (
                    <span className="text-warning">
                      {' '}
                      ({parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} skipped)
                    </span>
                  )}
                </p>
              </div>
              <button
                className="button button-primary"
                onClick={handleRunCategorization}
                disabled={!canRunCategorization || isProcessing}
                aria-busy={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Run Categorization'}
              </button>
            </div>

            {!rulesFile && !rulesError && (
              <div className="alert alert-info" role="status">
                Upload or paste rules JSON above to enable categorization.
              </div>
            )}
          </section>
        )}

        {/* Results */}
        {categorized && summary && (
          <ResultsSection
            categorized={categorized}
            summary={summary}
            alerts={alerts}
            onDownloadJson={downloadJson}
            onExportScheduleC={handleExportScheduleC}
          />
        )}
      </main>

      <footer className="footer">
        <div className="container">
          <p className="text-muted text-sm">
            Your data stays on your device. Nothing is sent to any server.
          </p>
        </div>
      </footer>
    </>
  )
}

export default App
