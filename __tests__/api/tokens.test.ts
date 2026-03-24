/**
 * Tests for token routes:
 *  - POST /api/tokens/init    (src/app/api/tokens/init/route.ts)
 *  - POST /api/tokens/verify  (src/app/api/tokens/verify/route.ts)
 */

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
process.env.PAYSTACK_SECRET_KEY = 'test-paystack-key'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'

// ── Per-test overrides ────────────────────────────────────────────────────────
let existingTransactionData: unknown = null // null = no duplicate

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null })

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'token_transactions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: existingTransactionData, error: null })
          ),
          insert: mockInsert,
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
    rpc: mockRpc,
  })),
}))

jest.mock('server-only', () => ({}))

// ── Fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Default Paystack responses ────────────────────────────────────────────────
const paystackInitResponse = {
  status: true,
  data: { authorization_url: 'https://checkout.paystack.com/test', reference: 'ref_test123' },
}

const paystackVerifyResponse = {
  status: true,
  data: {
    status: 'success',
    reference: 'ref_test123',
    amount: 2500, // GHS 25.00 in kobo
    currency: 'GHS',
    metadata: {
      type: 'token_purchase',
      tokens: 30,
      user_id: 'user-1',
    },
  },
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('POST /api/tokens/init', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => paystackInitResponse,
    })
  })

  it('returns 400 for invalid pack name', async () => {
    const { POST } = await import('@/app/api/tokens/init/route')
    const req = new Request('http://localhost/api/tokens/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'xlarge', user_id: 'user-1', email: 'test@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid token pack/i)
  })

  it('calls Paystack with correct amount for small pack', async () => {
    const { POST } = await import('@/app/api/tokens/init/route')
    const req = new Request('http://localhost/api/tokens/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'small', user_id: 'user-1', email: 'test@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.authorization_url).toBeDefined()
    // Verify Paystack was called
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/initialize',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('calls Paystack with correct amount for medium pack', async () => {
    const { POST } = await import('@/app/api/tokens/init/route')
    const req = new Request('http://localhost/api/tokens/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'medium', user_id: 'user-1', email: 'test@example.com' }),
    })
    await POST(req)
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.amount).toBe(2500) // GHS 25 * 100
    expect(callBody.metadata.tokens).toBe(30)
  })

  it('returns 500 when Paystack init fails', async () => {
    const { POST } = await import('@/app/api/tokens/init/route')
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ status: false, message: 'Invalid key' }),
    })
    const req = new Request('http://localhost/api/tokens/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'large', user_id: 'user-1', email: 'test@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/tokens/verify', () => {
  beforeEach(() => {
    existingTransactionData = null
    mockInsert.mockClear()
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockRpc.mockClear()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => paystackVerifyResponse,
    })
  })

  it('returns 400 when reference is missing', async () => {
    const { POST } = await import('@/app/api/tokens/verify/route')
    const req = new Request('http://localhost/api/tokens/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/missing reference/i)
  })

  it('returns 400 when Paystack verification fails', async () => {
    const { POST } = await import('@/app/api/tokens/verify/route')
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: false, message: 'Invalid transaction' }),
    })
    const req = new Request('http://localhost/api/tokens/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: 'bad_ref' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-token_purchase transaction type', async () => {
    const { POST } = await import('@/app/api/tokens/verify/route')
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: { ...paystackVerifyResponse.data, metadata: { type: 'auction_payment' } },
      }),
    })
    const req = new Request('http://localhost/api/tokens/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: 'ref_test123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid transaction type/i)
  })

  it('credits tokens and logs transaction on first verify', async () => {
    const { POST } = await import('@/app/api/tokens/verify/route')
    const req = new Request('http://localhost/api/tokens/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: 'ref_test123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('increment_tokens', expect.objectContaining({
      uid: 'user-1',
      amount: 30,
    }))
    expect(mockInsert).toHaveBeenCalled()
  })

  it('returns 200 without re-crediting on duplicate reference', async () => {
    const { POST } = await import('@/app/api/tokens/verify/route')
    existingTransactionData = { id: 'tx-existing' }
    const req = new Request('http://localhost/api/tokens/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: 'ref_test123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    // rpc and insert should NOT be called for duplicates
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
