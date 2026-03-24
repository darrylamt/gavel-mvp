/**
 * E2E: Search journey
 * Type query → dropdown → click → navigate, full search results page
 */

import { test, expect } from '@playwright/test'

test.describe('Search journey', () => {
  test('search bar shows results dropdown', async ({ page }) => {
    // Mock the search API to return predictable results
    await page.route('/api/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { id: 'a1', title: 'iPhone 15 Pro', type: 'auction', price: 1200, image_url: null, similarity: 0.9 },
            { id: 'p1', title: 'iPhone Case', type: 'product', price: 50, image_url: null, similarity: 0.8 },
          ],
          noResults: false,
          query: 'iphone',
        }),
      })
    })

    await page.goto('/')

    // Find the search input
    const searchInput = page.getByPlaceholder(/search/i).first()
    await searchInput.fill('iphone')

    // Wait for dropdown to appear
    await page.waitForTimeout(500)

    // Results should appear in dropdown
    await expect(page.getByText('iPhone 15 Pro')).toBeVisible({ timeout: 5_000 })
  })

  test('pressing Enter on search navigates to search results page', async ({ page }) => {
    await page.route('/api/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [], noResults: true, query: 'testquery' }),
      })
    })

    await page.goto('/')

    const searchInput = page.getByPlaceholder(/search/i).first()
    await searchInput.fill('testquery')
    await searchInput.press('Enter')

    // Should navigate to search results page
    await expect(page).toHaveURL(/search.*testquery|q=testquery/i, { timeout: 5_000 })
  })

  test('empty query does not navigate to search page', async ({ page }) => {
    await page.goto('/')
    const initialUrl = page.url()

    const searchInput = page.getByPlaceholder(/search/i).first()
    await searchInput.fill('   ')
    await searchInput.press('Enter')

    // URL should not change to a search URL
    await page.waitForTimeout(300)
    const finalUrl = page.url()
    expect(finalUrl).not.toMatch(/search\?q=/)
  })

  test('search results page renders for a valid query', async ({ page }) => {
    await page.route('/api/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { id: 'a1', title: 'Laptop Dell XPS', type: 'auction', price: 2000, image_url: null, similarity: 0.85 },
          ],
          noResults: false,
          query: 'laptop',
        }),
      })
    })

    await page.goto('/search?q=laptop')

    // Should show results
    await expect(page.getByText('Laptop Dell XPS')).toBeVisible({ timeout: 5_000 })
  })

  test('search results page shows no-results state for gibberish', async ({ page }) => {
    await page.route('/api/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [], noResults: true, query: 'xyzabc123' }),
      })
    })

    await page.goto('/search?q=xyzabc123')

    // Should show empty state
    await expect(page.getByText(/no results|nothing found|0 result/i)).toBeVisible({ timeout: 5_000 })
  })
})
