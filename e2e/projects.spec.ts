import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('projects page loads and shows at least 1 project', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()
    // Wait for project list to load — at least one link to a project
    await expect(page.getByRole('link', { name: /./i }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('project detail page loads', async ({ page }) => {
    await page.goto('/projects')
    // Click the first project link
    const projectLink = page.locator('a[href^="/projects/"]').first()
    await expect(projectLink).toBeVisible({ timeout: 10_000 })
    await projectLink.click()
    await expect(page).toHaveURL(/\/projects\/[^/]+$/)
  })

  test('project settings page loads (admin only)', async ({ page }) => {
    await page.goto('/projects')
    const projectLink = page.locator('a[href^="/projects/"]').first()
    await expect(projectLink).toBeVisible({ timeout: 10_000 })
    const href = await projectLink.getAttribute('href')
    await page.goto(`${href}/settings`)
    await expect(page.getByRole('heading', { name: /project settings/i })).toBeVisible()
  })
})
