/**
 * localStorage persistence with versioned schema
 * Provides auto-save, migration support, and safe data management
 */

const STORAGE_KEY = 'family-office-tracker'
const CURRENT_VERSION = 1

/**
 * @typedef {Object} StoredData
 * @property {number} version - Schema version for migrations
 * @property {Array} transactions - Imported transactions
 * @property {Object|null} rulesFile - Rules configuration
 * @property {Array|null} categorized - Categorized transactions
 * @property {Object|null} summary - Summary data
 * @property {number} lastUpdated - Unix timestamp
 */

/**
 * Get default empty state
 * @returns {StoredData}
 */
function getDefaultState() {
  return {
    version: CURRENT_VERSION,
    transactions: [],
    rulesFile: null,
    categorized: null,
    summary: null,
    lastUpdated: Date.now()
  }
}

/**
 * Migrate data from older schema versions
 * @param {Object} data - Data to migrate
 * @returns {StoredData}
 */
function migrateData(data) {
  let current = { ...data }

  // Version 0 -> 1: Initial schema
  if (!current.version || current.version < 1) {
    current = {
      ...getDefaultState(),
      ...current,
      version: 1
    }
  }

  // Future migrations would go here:
  // if (current.version < 2) { ... current.version = 2 }

  return current
}

/**
 * Load data from localStorage
 * @returns {StoredData}
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getDefaultState()
    }

    const parsed = JSON.parse(raw)
    const migrated = migrateData(parsed)

    // Save if migration occurred
    if (migrated.version !== parsed.version) {
      saveData(migrated)
    }

    return migrated
  } catch (err) {
    console.warn('Failed to load data from localStorage:', err)
    return getDefaultState()
  }
}

/**
 * Save data to localStorage
 * @param {Partial<StoredData>} updates - Data to save (merged with existing)
 * @returns {boolean} Success status
 */
export function saveData(updates) {
  try {
    const current = loadData()
    const updated = {
      ...current,
      ...updates,
      version: CURRENT_VERSION,
      lastUpdated: Date.now()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return true
  } catch (err) {
    console.error('Failed to save data to localStorage:', err)
    return false
  }
}

/**
 * Save transactions to storage
 * @param {Array} transactions
 * @returns {boolean}
 */
export function saveTransactions(transactions) {
  return saveData({ transactions, categorized: null, summary: null })
}

/**
 * Save rules file to storage
 * @param {Object|null} rulesFile
 * @returns {boolean}
 */
export function saveRulesFile(rulesFile) {
  return saveData({ rulesFile, categorized: null, summary: null })
}

/**
 * Save categorization results
 * @param {Array} categorized
 * @param {Object} summary
 * @returns {boolean}
 */
export function saveCategorization(categorized, summary) {
  return saveData({ categorized, summary })
}

/**
 * Clear all stored data
 * @returns {boolean}
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (err) {
    console.error('Failed to clear localStorage:', err)
    return false
  }
}

/**
 * Check if there is any saved data
 * @returns {boolean}
 */
export function hasStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false

    const parsed = JSON.parse(raw)
    return (
      (parsed.transactions && parsed.transactions.length > 0) ||
      parsed.rulesFile !== null ||
      parsed.categorized !== null
    )
  } catch {
    return false
  }
}

/**
 * Get storage usage info
 * @returns {{ used: number, available: boolean }}
 */
export function getStorageInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || ''
    const used = new Blob([raw]).size

    // Test if we can still write (localStorage typically ~5-10MB)
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, 'x')
    localStorage.removeItem(testKey)

    return { used, available: true }
  } catch {
    return { used: 0, available: false }
  }
}

/**
 * Export all data as JSON for backup
 * @returns {string}
 */
export function exportBackup() {
  const data = loadData()
  return JSON.stringify(data, null, 2)
}

/**
 * Import data from backup
 * @param {string} jsonString
 * @returns {{ success: boolean, error?: string }}
 */
export function importBackup(jsonString) {
  try {
    const data = JSON.parse(jsonString)

    // Basic validation
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: 'Invalid backup format' }
    }

    // Migrate and save
    const migrated = migrateData(data)
    saveData(migrated)

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
