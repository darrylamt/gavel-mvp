/**
 * Tests for GET|POST /api/arkesel/dispatch
 * Source: src/app/api/arkesel/dispatch/route.ts
 */

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.ARKESEL_DISPATCH_SECRET = 'test-arkesel-secret'
process.env.ARKESEL_ENABLED = 'true'

// ── Per-test overrides ────────────────────────────────────────────────────────
let smsRows: unknown[] = []
let smsError: unknown = null
let sendSmsSuccess = true

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockUpdateChain = { eq: jest.fn().mockResolvedValue({ data: null, error: null }) }

jest.mock('@/lib/serverSupabase', () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'sms_notifications') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: smsRows, error: smsError })
          ),
          update: jest.fn(() => mockUpdateChain),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
    }),
  })),
}))

// ── SMS provider mock ─────────────────────────────────────────────────────────
jest.mock('@/lib/arkesel/provider', () => ({
  sendArkeselSMS: jest.fn().mockImplementation(async () => {
    if (!sendSmsSuccess) return { success: false, error: 'Provider error' }
    return { success: true, messageId: 'msg-123' }
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeDispatchRequest(options: {
  secret?: string
  useHeader?: boolean
  useBearer?: boolean
} = {}) {
  const { secret = 'test-arkesel-secret', useHeader = false, useBearer = false } = options
  const headers: Record<string, string> = {}
  let url = 'http://localhost/api/arkesel/dispatch'

  if (useHeader) {
    headers['x-dispatch-secret'] = secret
  } else if (useBearer) {
    headers['authorization'] = `Bearer ${secret}`
  } else {
    url += `?secret=${secret}`
  }

  return new Request(url, { method: 'GET', headers })
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('GET /api/arkesel/dispatch', () => {
  beforeEach(() => {
    smsRows = []
    smsError = null
    sendSmsSuccess = true
  })

  it('returns 401 for missing secret', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    const req = new Request('http://localhost/api/arkesel/dispatch', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong secret', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    const req = makeDispatchRequest({ secret: 'wrong-secret' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('accepts secret in query param', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    const req = makeDispatchRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('accepts secret in x-dispatch-secret header', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    const req = makeDispatchRequest({ useHeader: true })
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('accepts secret as Bearer token', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    const req = makeDispatchRequest({ useBearer: true })
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('returns processed=0 when queue is empty', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    smsRows = []
    const req = makeDispatchRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.processed).toBe(0)
  })

  it('sends pending SMS and returns correct counts', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    smsRows = [
      { id: 'sms-1', phone: '+233501234567', message: 'Your bid was accepted' },
      { id: 'sms-2', phone: '+233509876543', message: 'Your order is ready' },
    ]
    const req = makeDispatchRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.processed).toBe(2)
    expect(json.sent).toBe(2)
    expect(json.failed).toBe(0)
  })

  it('counts provider failures in failed', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    sendSmsSuccess = false
    smsRows = [{ id: 'sms-1', phone: '+233501234567', message: 'Test' }]
    const req = makeDispatchRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(json.failed).toBe(1)
  })

  it('returns 200 with SMS disabled message when ARKESEL_ENABLED is false', async () => {
    process.env.ARKESEL_ENABLED = 'false'
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    const req = makeDispatchRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toMatch(/disabled/i)
    process.env.ARKESEL_ENABLED = 'true' // restore
  })

  it('returns 500 when DB query fails', async () => {
    const { GET } = await import('@/app/api/arkesel/dispatch/route')
    smsError = { message: 'Connection error' }
    smsRows = null as unknown as unknown[]
    const req = makeDispatchRequest()
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/arkesel/dispatch', () => {
  beforeEach(() => {
    smsRows = []
    smsError = null
    sendSmsSuccess = true
  })

  it('delegates to GET handler', async () => {
    const { POST } = await import('@/app/api/arkesel/dispatch/route')
    const req = makeDispatchRequest()
    const postReq = new Request(req.url, { method: 'POST', headers: req.headers })
    const res = await POST(postReq)
    expect(res.status).toBe(200)
  })
})
