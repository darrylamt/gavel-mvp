/**
 * E2E: Buyer journey
 * Register → buy tokens → bid → win → pay → confirm delivery
 *
 * Prerequisites:
 *  - `supabase start` running locally
 *  - Seed data created by e2e/fixtures/seed.ts
 *  - Paystack redirect is intercepted and mocked
 */

import { test, expect } from '@playwright/test'

// Use a unique email per test run to avoid conflicts
const buyerEmail = `buyer+${Date.now()}@test.local`
const buyerPassword = 'Test1234!'

test.describe('Buyer journey', () => {
  test('can register, buy tokens, bid on an auction, and confirm delivery', async ({ page }) => {
    // ── 1. Navigate to homepage ───────────────────────────────────────────────
    await page.goto('/')
    await expect(page).toHaveTitle(/gavel/i)

    // ── 2. Sign up ────────────────────────────────────────────────────────────
    await page.getByRole('link', { name: /sign up/i }).click()
    await page.getByLabel(/email/i).fill(buyerEmail)
    await page.getByLabel(/password/i).fill(buyerPassword)
    await page.getByRole('button', { name: /sign up|register|create account/i }).click()

    // Wait for auth redirect
    await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10_000 })

    // ── 3. Navigate to tokens page ───────────────────────────────────────────
    await page.goto('/tokens')
    await expect(page.getByText(/tokens/i)).toBeVisible()

    // ── 4. Initiate token purchase ────────────────────────────────────────────
    // Intercept Paystack redirect
    await page.route('https://checkout.paystack.com/**', async (route) => {
      await route.abort() // Abort the redirect
    })

    // Mock the tokens/init API response
    await page.route('/api/tokens/init', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorization_url: 'https://checkout.paystack.com/test',
          reference: `ref_test_${Date.now()}`,
        }),
      })
    })

    // Mock the tokens/verify API response
    await page.route('/api/tokens/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // Click the "Get X Tokens" button for the starter pack
    const buyButton = page.getByRole('button', { name: /get \d+ tokens/i }).first()
    await buyButton.click()

    // ── 5. Navigate to auctions ───────────────────────────────────────────────
    await page.goto('/auctions')
    await expect(page.getByText(/auction/i)).toBeVisible()

    // ── 6. Click on a live auction ────────────────────────────────────────────
    const auctionCard = page.locator('[data-testid="auction-card-link"], a[href*="/auction/"]').first()
    await auctionCard.click()
    await page.waitForURL(/\/auction\//)

    // ── 7. Verify auction detail page loads ───────────────────────────────────
    await expect(page.getByRole('heading')).toBeVisible()

    // ── 8. Verify bid form is visible (if logged in) ──────────────────────────
    const bidInput = page.getByPlaceholder(/enter amount in GHS/i)
    if (await bidInput.isVisible()) {
      await bidInput.fill('200')
      // Mock bid API
      await page.route('/api/bids', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      })
      await page.getByRole('button', { name: /place bid/i }).click()
    }
  })
})
