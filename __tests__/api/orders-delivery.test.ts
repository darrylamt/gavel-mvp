/**
 * Tests for POST /api/orders/confirm-delivery
 * Source: src/app/api/orders/confirm-delivery/route.ts
 */

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'

// ── Per-test overrides ────────────────────────────────────────────────────────
let shopOrderData: unknown = { user_id: 'buyer-1', delivered: false }
let shopOrderError: unknown = null
let auctionData: unknown = { winner_id: 'buyer-1', delivered: false }
let auctionError: unknown = null
let payoutsData: unknown[] = [{ id: 'payout-1', status: 'pending', seller_id: 'seller-1' }]

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockUpdateChain = { eq: jest.fn().mockResolvedValue({ data: null, error: null }) }

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'shop_orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn(() => mockUpdateChain),
          single: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: shopOrderData, error: shopOrderError })
          ),
        }
      }
      if (table === 'auctions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn(() => mockUpdateChain),
          single: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: auctionData, error: auctionError })
          ),
        }
      }
      if (table === 'payouts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn(() => mockUpdateChain),
          in: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: payoutsData, error: null })
          ),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn(() => mockUpdateChain),
      }
    }),
  })),
}))

jest.mock('server-only', () => ({}))

jest.mock('@/lib/arkesel/events', () => ({
  queuePayoutHeldNotification: jest.fn().mockResolvedValue(undefined),
}))

// ── Fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/orders/confirm-delivery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/orders/confirm-delivery', () => {
  beforeEach(() => {
    shopOrderData = { user_id: 'buyer-1', delivered: false }
    shopOrderError = null
    auctionData = { winner_id: 'buyer-1', delivered: false }
    auctionError = null
    payoutsData = [{ id: 'payout-1', status: 'pending', seller_id: 'seller-1' }]
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  })

  it('returns 400 when buyer_id is missing', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/missing buyer_id/i)
  })

  it('returns 400 when neither order_id nor auction_id is provided', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    const res = await POST(makeRequest({ buyer_id: 'buyer-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/order_id or auction_id/i)
  })

  it('returns 404 when shop order not found', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    shopOrderData = null
    shopOrderError = { message: 'Not found' }
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', order_id: 'bad-order' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when buyer does not own the order', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    shopOrderData = { user_id: 'other-user', delivered: false }
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', order_id: 'order-1' }))
    expect(res.status).toBe(403)
  })

  it('returns 200 when delivery already confirmed for order', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    shopOrderData = { user_id: 'buyer-1', delivered: true }
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', order_id: 'order-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toMatch(/already confirmed/i)
  })

  it('triggers payout initiation on shop order confirmation', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', order_id: 'order-1' }))
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payouts/initiate'),
      expect.any(Object)
    )
  })

  it('returns 404 when auction not found', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    auctionData = null
    auctionError = { message: 'Not found' }
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', auction_id: 'bad-auction' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when buyer is not the auction winner', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    auctionData = { winner_id: 'other-winner', delivered: false }
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', auction_id: 'auction-1' }))
    expect(res.status).toBe(403)
  })

  it('returns 200 when auction delivery already confirmed', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    auctionData = { winner_id: 'buyer-1', delivered: true }
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', auction_id: 'auction-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toMatch(/already confirmed/i)
  })

  it('triggers payout initiation on auction delivery confirmation', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    const res = await POST(makeRequest({ buyer_id: 'buyer-1', auction_id: 'auction-1' }))
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payouts/initiate'),
      expect.any(Object)
    )
  })

  it('does not trigger payout when payout is on_hold', async () => {
    const { POST } = await import('@/app/api/orders/confirm-delivery/route')
    payoutsData = [{ id: 'payout-1', status: 'on_hold', seller_id: 'seller-1' }]
    await POST(makeRequest({ buyer_id: 'buyer-1', order_id: 'order-1' }))
    // Fetch should NOT be called since payout is on hold
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
