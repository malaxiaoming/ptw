import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('dashboard loads with status counts', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    // Status counts section should be present
    await expect(page.getByText(/status/i).first()).toBeVisible()
  })

  test('dashboard shows pending actions section', async ({ page }) => {
    await expect(page.getByText(/pending/i).first()).toBeVisible()
  })
})
