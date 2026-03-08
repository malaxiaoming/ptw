import { type Page, expect } from '@playwright/test'

type Role = 'admin' | 'user'

const credentials: Record<Role, { email: string; password: string }> = {
  admin: {
    email: process.env.E2E_TEST_ADMIN_EMAIL!,
    password: process.env.E2E_TEST_ADMIN_PASSWORD!,
  },
  user: {
    email: process.env.E2E_TEST_USER_EMAIL!,
    password: process.env.E2E_TEST_USER_PASSWORD!,
  },
}

export async function loginAs(page: Page, role: Role) {
  const { email, password } = credentials[role]

  await page.goto('/login')
  await page.getByLabel(/email or phone/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}
