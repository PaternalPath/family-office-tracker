import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAndParseCsv } from '../../packages/core/src/parser.js'
import {
  TransactionSchema,
  validateTransaction,
  formatZodErrors
} from '../../packages/core/src/schemas.js'

test('TransactionSchema validates correct transaction', () => {
  const txn = {
    id: 'test:2025-01-01:abc123:1',
    date: '2025-01-01',
    description: 'TEST MERCHANT',
    amount: -50.0,
    source: 'generic'
  }

  const result = TransactionSchema.safeParse(txn)
  assert.equal(result.success, true)
  assert.deepEqual(result.data, txn)
})

test('TransactionSchema rejects invalid date format', () => {
  const txn = {
    id: 'test:2025-01-01:abc123:1',
    date: '01/01/2025', // Wrong format
    description: 'TEST MERCHANT',
    amount: -50.0,
    source: 'generic'
  }

  const result = TransactionSchema.safeParse(txn)
  assert.equal(result.success, false)
})

test('TransactionSchema rejects empty description', () => {
  const txn = {
    id: 'test:2025-01-01:abc123:1',
    date: '2025-01-01',
    description: '',
    amount: -50.0,
    source: 'generic'
  }

  const result = TransactionSchema.safeParse(txn)
  assert.equal(result.success, false)
})

test('TransactionSchema rejects non-finite amount', () => {
  const txn = {
    id: 'test:2025-01-01:abc123:1',
    date: '2025-01-01',
    description: 'TEST',
    amount: Infinity,
    source: 'generic'
  }

  const result = TransactionSchema.safeParse(txn)
  assert.equal(result.success, false)
})

test('validateTransaction returns success for valid data', () => {
  const txn = {
    id: 'test:2025-01-01:abc123:1',
    date: '2025-01-01',
    description: 'TEST MERCHANT',
    amount: -50.0,
    source: 'generic'
  }

  const result = validateTransaction(txn)
  assert.equal(result.success, true)
})

test('validateTransaction returns error for invalid data', () => {
  const txn = { id: 'test', date: 'invalid' }

  const result = validateTransaction(txn)
  assert.equal(result.success, false)
  assert.ok(result.error)
})

test('formatZodErrors creates user-friendly messages', () => {
  const txn = { id: '', date: 'bad', description: '', amount: 'not a number' }
  const result = TransactionSchema.safeParse(txn)

  assert.equal(result.success, false)
  const messages = formatZodErrors(result.error)
  assert.ok(Array.isArray(messages))
  assert.ok(messages.length > 0)
  assert.ok(messages.every((m) => typeof m === 'string'))
})

test('validateAndParseCsv returns valid transactions and errors', () => {
  const csv = `Date,Description,Amount
2025-01-01,VALID MERCHANT,-100.00
invalid-date,ANOTHER MERCHANT,-50.00
2025-01-03,THIRD MERCHANT,-75.00`

  const result = validateAndParseCsv(csv, { source: 'generic' })

  // Should have 2 valid and 1 error (invalid date row)
  assert.equal(result.validCount, 2)
  assert.equal(result.transactions.length, 2)
  assert.equal(result.errorCount, 1)
  assert.equal(result.errors.length, 1)
  assert.ok(result.errors[0].message.includes('Invalid date'))
})

test('validateAndParseCsv handles completely empty CSV', () => {
  const csv = ''

  const result = validateAndParseCsv(csv, { source: 'generic' })

  assert.equal(result.validCount, 0)
  assert.equal(result.errorCount, 1)
  assert.ok(result.errors[0].message.includes('empty'))
})

test('validateAndParseCsv handles missing headers', () => {
  const csv = `Name,Value,Other
John,100,test`

  const result = validateAndParseCsv(csv, { source: 'generic' })

  assert.equal(result.validCount, 0)
  assert.equal(result.errorCount, 1)
  assert.ok(result.errors[0].message.includes('Missing required headers'))
})

test('validateAndParseCsv handles unknown source gracefully', () => {
  const csv = `Date,Description,Amount
2025-01-01,TEST,-100`

  const result = validateAndParseCsv(csv, { source: 'unknown-source' })

  assert.equal(result.validCount, 0)
  assert.equal(result.errorCount, 1)
  assert.ok(result.errors[0].message.includes('Unknown source'))
})

test('validateAndParseCsv preserves all fields in valid transactions', () => {
  const csv = `Date,Description,Amount
2025-01-15,AMAZON PURCHASE,-250.00`

  const result = validateAndParseCsv(csv, { source: 'generic' })

  assert.equal(result.validCount, 1)
  const txn = result.transactions[0]
  assert.equal(txn.date, '2025-01-15')
  assert.equal(txn.description, 'AMAZON PURCHASE')
  assert.equal(txn.amount, -250.0)
  assert.equal(txn.source, 'generic')
  assert.ok(txn.id.startsWith('generic:'))
})
