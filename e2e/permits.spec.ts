import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Permits', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'user')
  })

  test('permits list page loads', async ({ page }) => {
    await page.goto('/permits')
    await expect(page.getByRole('heading', { name: /permits/i })).toBeVisible()
  })

  test('create permit page loads with form', async ({ page }) => {
    await page.goto('/permits/new')
    await expect(page.getByRole('heading', { name: /new permit|create permit/i })).toBeVisible()
  })
})
