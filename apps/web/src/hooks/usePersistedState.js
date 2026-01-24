import { useState, useEffect, useCallback } from 'react'
import {
  loadData,
  saveTransactions,
  saveRulesFile,
  saveCategorization,
  clearAllData,
  hasStoredData
} from '../lib/storage.js'

/**
 * Hook for managing persisted application state
 * Loads from localStorage on mount and auto-saves on changes
 */
export function usePersistedState() {
  // Core state
  const [transactions, setTransactionsState] = useState([])
  const [rulesFile, setRulesFileState] = useState(null)
  const [categorized, setCategorizedState] = useState(null)
  const [summary, setSummaryState] = useState(null)

  // UI state (not persisted)
  const [isLoading, setIsLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  // Load data on mount
  useEffect(() => {
    const data = loadData()
    setTransactionsState(data.transactions || [])
    setRulesFileState(data.rulesFile)
    setCategorizedState(data.categorized)
    setSummaryState(data.summary)
    setHasData(hasStoredData())
    setIsLoading(false)
  }, [])

  // Wrapped setters that auto-save
  const setTransactions = useCallback((txns) => {
    setTransactionsState(txns)
    setCategorizedState(null)
    setSummaryState(null)
    saveTransactions(txns)
    setHasData(txns.length > 0 || rulesFile !== null)
  }, [rulesFile])

  const setRulesFile = useCallback((rules) => {
    setRulesFileState(rules)
    setCategorizedState(null)
    setSummaryState(null)
    saveRulesFile(rules)
    setHasData(transactions.length > 0 || rules !== null)
  }, [transactions])

  const setCategorization = useCallback((cat, sum) => {
    setCategorizedState(cat)
    setSummaryState(sum)
    saveCategorization(cat, sum)
  }, [])

  const clearData = useCallback(() => {
    setTransactionsState([])
    setRulesFileState(null)
    setCategorizedState(null)
    setSummaryState(null)
    clearAllData()
    setHasData(false)
  }, [])

  const reloadData = useCallback(() => {
    const data = loadData()
    setTransactionsState(data.transactions || [])
    setRulesFileState(data.rulesFile)
    setCategorizedState(data.categorized)
    setSummaryState(data.summary)
    setHasData(hasStoredData())
  }, [])

  return {
    // State
    transactions,
    rulesFile,
    categorized,
    summary,

    // Setters
    setTransactions,
    setRulesFile,
    setCategorization,

    // Actions
    clearData,
    reloadData,

    // UI state
    isLoading,
    hasData
  }
}
