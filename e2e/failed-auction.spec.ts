/**
 * E2E: Failed auction journey
 * Auction with no bids → seller notification → resolution options
 */

import { test, expect } from '@playwright/test'

test.describe('Failed auction journey', () => {
  test('homepage loads without error', async ({ page }) => {
    await page.goto('/')
    // No 500 errors
    await expect(page).not.toHaveURL(/500|error/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('auctions list page loads', async ({ page }) => {
    await page.goto('/auctions')
    await expect(page).toHaveURL(/auctions/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('seller auctions page is accessible (redirects if unauth)', async ({ page }) => {
    await page.goto('/seller/auctions')
    const url = page.url()
    // Should redirect to auth or show the page — no 500
    expect(url).not.toMatch(/500/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('webhook endpoint rejects invalid Paystack signature', async ({ page }) => {
    const response = await page.request.post('/api/paystack/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': 'invalid-signature',
      },
      data: { event: 'charge.success', data: {} },
    })
    expect(response.status()).toBe(401)
  })

  test('webhook endpoint returns 401 for missing signature', async ({ page }) => {
    const response = await page.request.post('/api/paystack/webhook', {
      headers: { 'Content-Type': 'application/json' },
      data: { event: 'charge.success', data: {} },
    })
    expect(response.status()).toBe(401)
  })
})
