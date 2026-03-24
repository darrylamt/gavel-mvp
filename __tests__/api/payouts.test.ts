/**
 * Tests for payout routes:
 *  - POST /api/payouts/auto-release  (src/app/api/payouts/auto-release/route.ts)
 *  - POST /api/payouts/hold          (src/app/api/payouts/hold/route.ts)
 *  - POST /api/payouts/release       (src/app/api/payouts/release/route.ts)
 */

import { NextRequest } from 'next/server'

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
process.env.PAYOUT_DISPATCH_SECRET = 'test-dispatch-secret'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'

// ── Per-test overrides ────────────────────────────────────────────────────────
let adminData: unknown = { is_admin: true }
let payoutSingleData: unknown = {
  id: 'payout-1',
  status: 'pending',
  seller_id: 'seller-1',
  buyer_id: 'buyer-1',
  payout_amount: 100,
  order_id: null,
  auction_id: null,
}
let payoutsListData: unknown[] | null = []
let shopOrderData: unknown = { delivered: false }
let auctionDeliveredData: unknown = { delivered: false }
let payoutSingleError: unknown = null
let payoutsListError: unknown = null

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockUpdateEq = jest.fn().mockResolvedValue({ data: null, error: null })
const mockUpdateChain = { eq: mockUpdateEq }

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: adminData, error: null })
          ),
        }
      }
      if (table === 'payouts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          lt: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: payoutsListData, error: payoutsListError })
          ),
          update: jest.fn(() => mockUpdateChain),
          single: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: payoutSingleData, error: payoutSingleError })
          ),
        }
      }
      if (table === 'shop_orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn(() => mockUpdateChain),
          single: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: shopOrderData, error: null })
          ),
        }
      }
      if (table === 'auctions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: auctionDeliveredData, error: null })
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
  queuePayoutAutoReleasedNotifications: jest.fn().mockResolvedValue(undefined),
  queuePayoutHeldNotification: jest.fn().mockResolvedValue(undefined),
  queuePayoutReleasedNotification: jest.fn().mockResolvedValue(undefined),
}))

// Mock global fetch (used to call /api/payouts/initiate)
const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeAutoReleaseRequest(secret = 'test-dispatch-secret') {
  return new Request(`http://localhost:3000/api/payouts/auto-release?secret=${secret}`, {
    method: 'POST',
  })
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/payouts/auto-release', () => {
  beforeEach(() => {
    payoutsListData = []
    payoutsListError = null
    payoutSingleData = { id: 'payout-1', status: 'pending', seller_id: 'seller-1', buyer_id: 'buyer-1', payout_amount: 100 }
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  })

  it('returns 401 for missing or wrong secret', async () => {
    const { POST } = await import('@/app/api/payouts/auto-release/route')
    const req = makeAutoReleaseRequest('wrong-secret')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with released=0 when no payouts are overdue', async () => {
    const { POST } = await import('@/app/api/payouts/auto-release/route')
    payoutsListData = []
    const req = makeAutoReleaseRequest()
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.released).toBe(0)
  })

  it('initiates transfer for each overdue pending payout', async () => {
    const { POST } = await import('@/app/api/payouts/auto-release/route')
    payoutsListData = [
      { id: 'p1', status: 'pending', buyer_id: 'buyer-1', seller_id: 'seller-1', payout_amount: 100 },
      { id: 'p2', status: 'pending', buyer_id: 'buyer-2', seller_id: 'seller-2', payout_amount: 200 },
    ]
    const req = makeAutoReleaseRequest()
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.released).toBe(2)
    expect(json.failed).toBe(0)
  })

  it('counts initiate failures in failed count', async () => {
    const { POST } = await import('@/app/api/payouts/auto-release/route')
    payoutsListData = [
      { id: 'p1', status: 'pending', buyer_id: 'buyer-1', seller_id: 'seller-1', payout_amount: 100 },
    ]
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Transfer failed' }) })
    const req = makeAutoReleaseRequest()
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.released).toBe(0)
    expect(json.failed).toBe(1)
  })

  it('returns 500 when DB fetch fails', async () => {
    const { POST } = await import('@/app/api/payouts/auto-release/route')
    payoutsListError = { message: 'DB error' }
    payoutsListData = null
    const req = makeAutoReleaseRequest()
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/payouts/hold', () => {
  beforeEach(() => {
    adminData = { is_admin: true }
    payoutSingleData = {
      id: 'payout-1',
      status: 'pending',
      seller_id: 'seller-1',
    }
    payoutSingleError = null
  })

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/payouts/hold/route')
    const req = new Request('http://localhost/api/payouts/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'p1' }), // missing hold_reason + admin_id
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when caller is not admin', async () => {
    const { POST } = await import('@/app/api/payouts/hold/route')
    adminData = { is_admin: false }
    const req = new Request('http://localhost/api/payouts/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'p1', hold_reason: 'Fraud check', admin_id: 'user-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 404 when payout not found', async () => {
    const { POST } = await import('@/app/api/payouts/hold/route')
    payoutSingleData = null
    payoutSingleError = { message: 'Not found' }
    const req = new Request('http://localhost/api/payouts/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'bad-id', hold_reason: 'Fraud check', admin_id: 'admin-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 400 when payout is already on_hold', async () => {
    const { POST } = await import('@/app/api/payouts/hold/route')
    payoutSingleData = { id: 'payout-1', status: 'on_hold', seller_id: 'seller-1' }
    const req = new Request('http://localhost/api/payouts/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'payout-1', hold_reason: 'Fraud check', admin_id: 'admin-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and holds a pending payout', async () => {
    const { POST } = await import('@/app/api/payouts/hold/route')
    const req = new Request('http://localhost/api/payouts/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'payout-1', hold_reason: 'Fraud check', admin_id: 'admin-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe('POST /api/payouts/release', () => {
  beforeEach(() => {
    adminData = { is_admin: true }
    payoutSingleData = {
      id: 'payout-1',
      status: 'on_hold',
      seller_id: 'seller-1',
      order_id: 'order-1',
      auction_id: null,
    }
    payoutSingleError = null
    shopOrderData = { delivered: false }
    auctionDeliveredData = { delivered: false }
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  })

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/payouts/release/route')
    const req = new Request('http://localhost/api/payouts/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'p1' }), // missing admin_id
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when caller is not admin', async () => {
    const { POST } = await import('@/app/api/payouts/release/route')
    adminData = { is_admin: false }
    const req = new Request('http://localhost/api/payouts/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'payout-1', admin_id: 'user-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when payout is not on_hold', async () => {
    const { POST } = await import('@/app/api/payouts/release/route')
    payoutSingleData = { id: 'payout-1', status: 'pending', seller_id: 'seller-1', order_id: null, auction_id: null }
    const req = new Request('http://localhost/api/payouts/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'payout-1', admin_id: 'admin-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and sets new 5-day window when delivery not confirmed', async () => {
    const { POST } = await import('@/app/api/payouts/release/route')
    shopOrderData = { delivered: false }
    const req = new Request('http://localhost/api/payouts/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'payout-1', admin_id: 'admin-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.message).toMatch(/5-day/i)
  })

  it('initiates payout immediately when delivery is confirmed', async () => {
    const { POST } = await import('@/app/api/payouts/release/route')
    shopOrderData = { delivered: true }
    const req = new Request('http://localhost/api/payouts/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: 'payout-1', admin_id: 'admin-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toMatch(/initiated/i)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payouts/initiate'),
      expect.any(Object)
    )
  })
})
