/**
 * Tests for POST /api/bids
 * Source: src/app/api/bids/route.ts
 */

import { NextRequest } from 'next/server'

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'

// ── Supabase mock ────────────────────────────────────────────────────────────
const mockAuctionData = {
  id: 'auction-1',
  title: 'Test Auction',
  seller_id: 'seller-1',
  status: 'active',
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 120000).toISOString(), // 2 min remaining
  current_price: 100,
  reserve_price: 50,
  min_increment: 10,
  max_increment: null,
}

const mockProfileData = { token_balance: 5 }
const mockAuthUser = { id: 'user-1', email: 'test@example.com' }

// Per-test overrides for the mock chain
let auctionOverride: unknown = null
let profileOverride: unknown = null
let latestBidOverride: unknown = null
let previousTopBidOverride: unknown = null
let auctionError: unknown = null
let profileError: unknown = null
let bidInsertError: unknown = null

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation((_url: string, key: string) => {
    // Anon client — used for auth
    if (key === 'mock-anon-key') {
      return {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockAuthUser },
            error: null,
          }),
        },
      }
    }
    // Service client — used for DB ops
    const makeChain = (data: unknown, error: unknown = null) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: bidInsertError }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data, error }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    let callCount = 0
    return {
      from: jest.fn((table: string) => {
        if (table === 'auctions') {
          return {
            ...makeChain(auctionOverride ?? mockAuctionData, auctionError),
            update: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ data: null, error: null }) })),
          }
        }
        if (table === 'profiles') {
          return makeChain(profileOverride ?? mockProfileData, profileError)
        }
        if (table === 'bids') {
          callCount++
          // 1st bids call = latest bid check (callCount 1), 2nd = previous top bid (callCount 2)
          // 3rd = insert
          const bidsChain = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ data: null, error: bidInsertError }),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: latestBidOverride, error: null }),
          }
          return bidsChain
        }
        if (table === 'token_transactions') {
          return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) }
        }
        return makeChain(null)
      }),
    }
  }),
}))

// Mock notification/email side effects
jest.mock('@/lib/arkesel/events', () => ({
  queueBidNotifications: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/arkesel/queue', () => ({
  queueArkeselNotification: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/resend-service', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/maskBidderEmail', () => ({
  maskBidderEmail: jest.fn((email: string) => '***@example.com'),
}))

function makeRequest(body: unknown, token = 'valid-token') {
  return new NextRequest('http://localhost/api/bids', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/bids', () => {
  beforeEach(() => {
    auctionOverride = null
    profileOverride = null
    latestBidOverride = null
    previousTopBidOverride = null
    auctionError = null
    profileError = null
    bidInsertError = null
  })

  it('returns 401 when no Authorization header', async () => {
    const { POST } = await import('@/app/api/bids/route')
    const req = new NextRequest('http://localhost/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auction_id: 'a1', amount: 150 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when auction not found', async () => {
    auctionError = { message: 'Not found' }
    auctionOverride = null
    const { POST } = await import('@/app/api/bids/route')
    const res = await POST(makeRequest({ auction_id: 'bad-id', amount: 150 }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when auction is already ended', async () => {
    auctionOverride = { ...mockAuctionData, status: 'ended' }
    const { POST } = await import('@/app/api/bids/route')
    const res = await POST(makeRequest({ auction_id: 'auction-1', amount: 150 }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/ended/i)
  })

  it('returns 400 when bid is not higher than current price', async () => {
    const { POST } = await import('@/app/api/bids/route')
    const res = await POST(makeRequest({ auction_id: 'auction-1', amount: 100 })) // same as current_price
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/higher/i)
  })

  it('returns 400 when bid is below min_increment', async () => {
    // current_price = 100, min_increment = 10 → must bid >= 111
    const { POST } = await import('@/app/api/bids/route')
    const res = await POST(makeRequest({ auction_id: 'auction-1', amount: 105 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/at least/i)
  })

  it('returns 402 when user has insufficient tokens', async () => {
    profileOverride = { token_balance: 0 }
    const { POST } = await import('@/app/api/bids/route')
    const res = await POST(makeRequest({ auction_id: 'auction-1', amount: 150 }))
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error).toMatch(/insufficient tokens/i)
  })

  it('returns 400 when user tries to bid twice in a row', async () => {
    latestBidOverride = { user_id: 'user-1' } // same as mock auth user
    const { POST } = await import('@/app/api/bids/route')
    const res = await POST(makeRequest({ auction_id: 'auction-1', amount: 150 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/twice in a row/i)
  })

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/bids/route')
    const res = await POST(makeRequest({ auction_id: 'auction-1' })) // missing amount
    expect(res.status).toBe(400)
  })
})
