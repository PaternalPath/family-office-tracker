import { test, expect } from '@playwright/test'

test.describe('Family Office Tracker Smoke Tests', () => {
  test('app loads without errors', async ({ page }) => {
    await page.goto('/')

    // Check main heading is visible
    await expect(page.locator('h1')).toContainText('Family Office Tracker')

    // Check footer privacy note
    await expect(page.locator('footer')).toContainText('Your data stays on your device')

    // No JavaScript errors
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.waitForTimeout(1000)
    expect(errors).toHaveLength(0)
  })

  test('shows empty state for first-time users', async ({ page }) => {
    // Clear localStorage to simulate first visit
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Check for welcome message
    await expect(page.locator('.empty-state')).toBeVisible()
    await expect(page.locator('.empty-state')).toContainText('Welcome to Family Office Tracker')

    // Check for "Load Sample Data" button
    await expect(page.getByRole('button', { name: /load sample/i })).toBeVisible()
  })

  test('can load sample data', async ({ page }) => {
    // Clear localStorage first
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Click "Load Sample Data" button
    await page.getByRole('button', { name: /load sample/i }).first().click()

    // Wait for transactions to load
    await expect(page.getByText(/Successfully parsed/)).toBeVisible({ timeout: 10000 })

    // Check that transactions are shown
    await expect(page.getByText(/transaction/i)).toBeVisible()
  })

  test('can run categorization after loading sample data', async ({ page }) => {
    // Clear localStorage first
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Load sample data
    await page.getByRole('button', { name: /load sample/i }).first().click()
    await expect(page.getByText(/Successfully parsed/)).toBeVisible({ timeout: 10000 })

    // Click run categorization
    await page.getByRole('button', { name: /run categorization/i }).click()

    // Wait for results
    await expect(page.locator('.tabs')).toBeVisible({ timeout: 5000 })

    // Check that Summary tab is visible
    await expect(page.getByRole('tab', { name: 'Summary' })).toBeVisible()
  })

  test('tabs navigation works', async ({ page }) => {
    // Clear and load sample data
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByRole('button', { name: /load sample/i }).first().click()
    await expect(page.getByText(/Successfully parsed/)).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /run categorization/i }).click()
    await expect(page.locator('.tabs')).toBeVisible({ timeout: 5000 })

    // Click Monthly tab
    await page.getByRole('tab', { name: 'Monthly' }).click()
    await expect(page.getByText('Monthly Summary')).toBeVisible()

    // Click Transactions tab
    await page.getByRole('tab', { name: 'Transactions' }).click()
    await expect(page.getByText('Transactions')).toBeVisible()

    // Click Export tab
    await page.getByRole('tab', { name: 'Export' }).click()
    await expect(page.getByText('Export Data')).toBeVisible()
  })

  test('search filter works in transactions', async ({ page }) => {
    // Clear and load sample data
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByRole('button', { name: /load sample/i }).first().click()
    await expect(page.getByText(/Successfully parsed/)).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /run categorization/i }).click()
    await expect(page.locator('.tabs')).toBeVisible({ timeout: 5000 })

    // Go to transactions tab
    await page.getByRole('tab', { name: 'Transactions' }).click()

    // Search for a specific term
    await page.getByPlaceholder(/search/i).fill('OPENAI')

    // Should show filtered results
    await expect(page.getByText('OPENAI')).toBeVisible()
  })

  test('data persists after page refresh', async ({ page }) => {
    // Clear and load sample data
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByRole('button', { name: /load sample/i }).first().click()
    await expect(page.getByText(/Successfully parsed/)).toBeVisible({ timeout: 10000 })

    // Refresh page
    await page.reload()

    // Data should still be there
    await expect(page.getByText(/transaction/i)).toBeVisible()
  })

  test('clear data button works', async ({ page }) => {
    // Clear and load sample data
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByRole('button', { name: /load sample/i }).first().click()
    await expect(page.getByText(/Successfully parsed/)).toBeVisible({ timeout: 10000 })

    // Handle confirmation dialog
    page.on('dialog', (dialog) => dialog.accept())

    // Click clear data button
    await page.getByRole('button', { name: /clear data/i }).click()

    // Should show empty state again
    await expect(page.locator('.empty-state')).toBeVisible()
  })
})
