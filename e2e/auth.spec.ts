import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Auth flows', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email or phone/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('protected route redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login with valid credentials redirects to /dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('logout redirects to /login', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: /forgot|reset/i })).toBeVisible()
  })
})
