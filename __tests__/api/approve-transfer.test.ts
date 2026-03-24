/**
 * Tests for POST /api/paystack/approve-transfer
 * Source: src/app/api/paystack/approve-transfer/route.ts
 */

import crypto from 'crypto'

// ── Env setup ────────────────────────────────────────────────────────────────
const TEST_SECRET = 'test-paystack-secret-key-12345'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
process.env.PAYSTACK_SECRET_KEY = TEST_SECRET

// ── Helpers ───────────────────────────────────────────────────────────────────
function sign(body: object, secret = TEST_SECRET): string {
  return crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex')
}

function makeApproveRequest(body: object, customSignature?: string) {
  const signature = customSignature ?? sign(body)
  return new Request('http://localhost/api/paystack/approve-transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': signature,
    },
    body: JSON.stringify(body),
  })
}

// ── Per-test overrides ────────────────────────────────────────────────────────
let payoutData: unknown = { status: 'processing' }
let payoutError: unknown = null

// ── Supabase mock ─────────────────────────────────────────────────────────────
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: payoutData, error: payoutError })
      ),
    })),
  })),
}))

jest.mock('server-only', () => ({}))

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/paystack/approve-transfer', () => {
  beforeEach(() => {
    payoutData = { status: 'processing' }
    payoutError = null
  })

  it('returns 400 for invalid signature', async () => {
    const { POST } = await import('@/app/api/paystack/approve-transfer/route')
    const body = { transfer_code: 'TRF_123', reference: 'payout_p1_1700000000' }
    const req = makeApproveRequest(body, 'bad-signature')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.status).toBe('declined')
  })

  it('returns 400 for missing transfer_code or reference', async () => {
    const { POST } = await import('@/app/api/paystack/approve-transfer/route')
    const body = { transfer_code: 'TRF_123' } // missing reference
    const req = makeApproveRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.status).toBe('declined')
  })

  it('returns 400 for invalid reference format', async () => {
    const { POST } = await import('@/app/api/paystack/approve-transfer/route')
    const body = { transfer_code: 'TRF_123', reference: 'invalid-format' }
    const req = makeApproveRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.status).toBe('declined')
    expect(json.reason).toMatch(/invalid reference/i)
  })

  it('returns 404 when payout not found', async () => {
    const { POST } = await import('@/app/api/paystack/approve-transfer/route')
    payoutData = null
    payoutError = { message: 'Not found' }
    const body = { transfer_code: 'TRF_123', reference: 'payout_missing-id_1700000000' }
    const req = makeApproveRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.status).toBe('declined')
  })

  it('declines transfer when payout is on_hold', async () => {
    const { POST } = await import('@/app/api/paystack/approve-transfer/route')
    payoutData = { status: 'on_hold' }
    const body = { transfer_code: 'TRF_123', reference: 'payout_p1_1700000000' }
    const req = makeApproveRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('declined')
    expect(json.reason).toMatch(/on hold/i)
  })

  it('declines transfer when payout status is not processing', async () => {
    const { POST } = await import('@/app/api/paystack/approve-transfer/route')
    payoutData = { status: 'pending' }
    const body = { transfer_code: 'TRF_123', reference: 'payout_p1_1700000000' }
    const req = makeApproveRequest(body)
    const res = await POST(req)
    const json = await res.json()
    expect(json.status).toBe('declined')
  })

  it('approves transfer when payout is in processing state', async () => {
    const { POST } = await import('@/app/api/paystack/approve-transfer/route')
    payoutData = { status: 'processing' }
    const body = { transfer_code: 'TRF_123', reference: 'payout_p1_1700000000' }
    const req = makeApproveRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('approved')
  })
})
