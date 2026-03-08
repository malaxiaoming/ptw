import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Admin pages', () => {
  test('users page loads (admin)', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible()
  })

  test('workers page loads', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/workers')
    await expect(page.getByRole('heading', { name: /worker registry/i })).toBeVisible()
  })

  test('notifications page loads', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()
  })
})
