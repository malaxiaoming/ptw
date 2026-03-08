import { test, expect } from '@playwright/test'

test.describe('API smoke tests', () => {
  test('/api/me returns 401 unauthenticated', async ({ request }) => {
    const response = await request.get('/api/me')
    expect(response.status()).toBe(401)
  })

  test('/api/cron/expiry-check returns 401 without secret', async ({ request }) => {
    const response = await request.post('/api/cron/expiry-check')
    expect(response.status()).toBe(401)
  })

  test('/api/cron/expiry-check returns 200 with correct secret', async ({ request }) => {
    const cronSecret = process.env.CRON_SECRET
    const response = await request.post('/api/cron/expiry-check', {
      headers: { authorization: `Bearer ${cronSecret}` },
    })
    expect(response.status()).toBe(200)
  })
})
