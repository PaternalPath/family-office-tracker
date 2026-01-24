import test from 'node:test'
import assert from 'node:assert/strict'

// Mock localStorage for Node.js environment
const mockStorage = new Map()
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) ?? null,
  setItem: (key, value) => mockStorage.set(key, value),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
}

// Import after mock is set up
const { importBackup, exportBackup, loadData, clearAllData } = await import(
  '../../apps/web/src/lib/storage.js'
)

test.beforeEach(() => {
  mockStorage.clear()
})

test('importBackup rejects non-object data', () => {
  const result = importBackup('"just a string"')
  assert.equal(result.success, false)
  assert.ok(result.error.includes('expected an object'))
})

test('importBackup rejects null data', () => {
  const result = importBackup('null')
  assert.equal(result.success, false)
  assert.ok(result.error.includes('expected an object'))
})

test('importBackup rejects invalid JSON', () => {
  const result = importBackup('not valid json')
  assert.equal(result.success, false)
  assert.ok(result.error)
})

test('importBackup rejects transactions that is not an array', () => {
  const result = importBackup(JSON.stringify({ transactions: 'not an array' }))
  assert.equal(result.success, false)
  assert.ok(result.error.includes('transactions must be an array'))
})

test('importBackup rejects transactions with invalid entries', () => {
  const result = importBackup(JSON.stringify({ transactions: ['not an object'] }))
  assert.equal(result.success, false)
  assert.ok(result.error.includes('invalid entries'))
})

test('importBackup rejects transactions missing required fields', () => {
  const result = importBackup(
    JSON.stringify({
      transactions: [{ id: 'test', someField: 'value' }]
    })
  )
  assert.equal(result.success, false)
  assert.ok(result.error.includes('missing required fields'))
})

test('importBackup rejects rulesFile that is not an object', () => {
  const result = importBackup(JSON.stringify({ rulesFile: 'not an object' }))
  assert.equal(result.success, false)
  assert.ok(result.error.includes('rulesFile must be an object'))
})

test('importBackup rejects rulesFile without rules array', () => {
  const result = importBackup(JSON.stringify({ rulesFile: { notRules: [] } }))
  assert.equal(result.success, false)
  assert.ok(result.error.includes('rulesFile.rules must be an array'))
})

test('importBackup rejects categorized that is not an array', () => {
  const result = importBackup(JSON.stringify({ categorized: 'not an array' }))
  assert.equal(result.success, false)
  assert.ok(result.error.includes('categorized must be an array'))
})

test('importBackup accepts valid backup with transactions', () => {
  const backup = {
    version: 1,
    transactions: [
      { id: 'test:1', date: '2025-01-01', description: 'Test', amount: -100 }
    ],
    rulesFile: null,
    categorized: null
  }

  const result = importBackup(JSON.stringify(backup))
  assert.equal(result.success, true)
})

test('importBackup accepts valid backup with rules', () => {
  const backup = {
    version: 1,
    transactions: [],
    rulesFile: {
      rules: [{ name: 'Test Rule', category: 'Test', conditions: {} }]
    },
    categorized: null
  }

  const result = importBackup(JSON.stringify(backup))
  assert.equal(result.success, true)
})

test('importBackup accepts empty backup', () => {
  const backup = {
    version: 1,
    transactions: [],
    rulesFile: null,
    categorized: null
  }

  const result = importBackup(JSON.stringify(backup))
  assert.equal(result.success, true)
})

test('exportBackup returns valid JSON', () => {
  clearAllData()
  const exported = exportBackup()
  const parsed = JSON.parse(exported)

  assert.equal(typeof parsed, 'object')
  assert.ok('version' in parsed)
  assert.ok('transactions' in parsed)
})

test('importBackup and exportBackup are reversible', () => {
  const original = {
    version: 1,
    transactions: [
      { id: 'test:1', date: '2025-01-01', description: 'Coffee Shop', amount: -5.5 },
      { id: 'test:2', date: '2025-01-02', description: 'Grocery Store', amount: -75.0 }
    ],
    rulesFile: {
      rules: [{ name: 'Coffee', category: 'Food & Drink', conditions: { contains: 'coffee' } }]
    },
    categorized: null,
    summary: null
  }

  // Import the backup
  const importResult = importBackup(JSON.stringify(original))
  assert.equal(importResult.success, true)

  // Export it back
  const exported = exportBackup()
  const restored = JSON.parse(exported)

  // Verify data integrity (ignoring lastUpdated which changes)
  assert.deepEqual(restored.transactions, original.transactions)
  assert.deepEqual(restored.rulesFile, original.rulesFile)
  assert.equal(restored.version, original.version)
})

test('importBackup migrates old version data', () => {
  const oldBackup = {
    // No version field - should be migrated
    transactions: [{ id: 'test:1', date: '2025-01-01', description: 'Test', amount: -10 }]
  }

  const result = importBackup(JSON.stringify(oldBackup))
  assert.equal(result.success, true)

  const data = loadData()
  assert.equal(data.version, 1)
  assert.equal(data.transactions.length, 1)
})
