/**
 * Tests for POST /api/paystack/webhook
 * Source: src/app/api/paystack/webhook/route.ts
 */

import crypto from 'crypto'
import { NextRequest } from 'next/server'

// ── Env setup ────────────────────────────────────────────────────────────────
const TEST_SECRET = 'test-paystack-secret-key-12345'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
process.env.PAYSTACK_SECRET_KEY = TEST_SECRET

// ── Helpers ───────────────────────────────────────────────────────────────────
function sign(body: string, secret = TEST_SECRET): string {
  return crypto.createHmac('sha512', secret).update(body).digest('hex')
}

function makeWebhookRequest(payload: unknown, customSignature?: string): NextRequest {
  const body = JSON.stringify(payload)
  const signature = customSignature ?? sign(body)
  return new NextRequest('http://localhost/api/paystack/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': signature,
    },
    body,
  })
}

// ── Supabase mock ────────────────────────────────────────────────────────────
const mockUpdateChain = { eq: jest.fn().mockResolvedValue({ data: null, error: null }) }
const mockQueryChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  update: jest.fn(() => mockUpdateChain),
  single: jest.fn().mockResolvedValue({ data: { id: 'payout-1' }, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => mockQueryChain),
  })),
}))

// Mock lib dependencies
jest.mock('@/lib/auctionPaymentCandidate', () => ({
  resolveAuctionPaymentCandidate: jest.fn().mockResolvedValue({
    reason: 'ok',
    activeCandidate: { bidId: 'bid-1', userId: 'user-1', amount: 1000, rank: 1 },
    paymentDueAt: new Date(Date.now() + 3600000).toISOString(),
    auction: { id: 'auction-1' },
  }),
}))
jest.mock('@/lib/arkesel/events', () => ({
  queuePayoutSuccessNotification: jest.fn().mockResolvedValue(undefined),
  queuePayoutFailedNotification: jest.fn().mockResolvedValue(undefined),
  queuePayoutReversedNotification: jest.fn().mockResolvedValue(undefined),
}))

describe('POST /api/paystack/webhook', () => {
  it('returns 401 for missing signature header', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const body = JSON.stringify({ event: 'charge.success', data: {} })
    const req = new NextRequest('http://localhost/api/paystack/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for invalid signature', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const req = makeWebhookRequest({ event: 'charge.success' }, 'wrong-signature')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/invalid signature/i)
  })

  it('returns 401 when signature is from wrong secret', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const payload = JSON.stringify({ event: 'charge.success' })
    const wrongSig = sign(payload, 'wrong-secret')
    const req = new NextRequest('http://localhost/api/paystack/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': wrongSig },
      body: payload,
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 and updates payout for transfer.success event', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const payload = {
      event: 'transfer.success',
      data: { transfer_code: 'TRF_123', status: 'success' },
    }
    const req = makeWebhookRequest(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 and updates payout for transfer.failed event', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const payload = {
      event: 'transfer.failed',
      data: { transfer_code: 'TRF_123', status: 'failed' },
    }
    const req = makeWebhookRequest(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 and updates payout for transfer.reversed event', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const payload = {
      event: 'transfer.reversed',
      data: { transfer_code: 'TRF_123', status: 'reversed' },
    }
    const req = makeWebhookRequest(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 gracefully for unknown event types', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const req = makeWebhookRequest({ event: 'foo.bar', data: {} })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 400 for invalid JSON body with valid signature', async () => {
    const { POST } = await import('@/app/api/paystack/webhook/route')
    const body = 'this is not json'
    const sig = sign(body)
    const req = new NextRequest('http://localhost/api/paystack/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
      body,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
