/**
 * Tests for POST /api/delivery/create
 * Seller-initiated Dawurobo delivery dispatch.
 * Source: src/app/api/delivery/create/route.ts
 */

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
process.env.DAWUROBO_API_KEY = 'mock-dawurobo-key'
process.env.DAWUROBO_BASE_URL = 'https://api.dawurobo.test'

// ── Per-test mutable state ────────────────────────────────────────────────────
let authUser: unknown = { id: 'seller-1' }
let authError: unknown = null
let orderData: unknown = {
  id: 'order-1',
  user_id: 'buyer-1',
  status: 'paid',
  buyer_full_name: 'Test Buyer',
  buyer_phone: '0201234567',
  delivery_address: '123 Main St',
  delivery_city: 'Accra',
  delivery_notes: '',
  dawurobo_order_id: null,
}
let orderError: unknown = null
let sellerItemsData: unknown[] = [
  { id: 'item-1', title_snapshot: 'iPhone 15', quantity: 1 },
]
let sellerProfileData: unknown = {
  username: 'selleruser',
  phone: '0551234567',
  address: '456 Seller Ave, Kumasi',
}

// ── Supabase mock ─────────────────────────────────────────────────────────────
// shop_order_items is queried as a thenable chain:
//   supabase.from('shop_order_items').select(...).eq(...).eq(...)
// We make the chain object a thenable so await resolves it directly.
function makeItemsChain() {
  const chain: {
    select: jest.Mock
    eq: jest.Mock
    then: (
      resolve: (v: { data: unknown[]; error: null }) => unknown,
      reject?: (e: unknown) => unknown
    ) => Promise<unknown>
  } = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    then(resolve, reject) {
      return Promise.resolve({ data: sellerItemsData, error: null }).then(resolve, reject)
    },
  }
  return chain
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: authUser }, error: authError })
      ),
    },
    from: jest.fn((table: string) => {
      if (table === 'shop_orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
          maybeSingle: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: orderData, error: orderError })
          ),
        }
      }
      if (table === 'shop_order_items') {
        return makeItemsChain()
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: sellerProfileData, error: null }),
        }
      }
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { name: 'Test Shop' }, error: null }),
        }
      }
      if (table === 'delivery_events') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  })),
}))

jest.mock('server-only', () => ({}))

// ── Fetch mock (for Dawurobo API calls) ───────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(
  body: Record<string, unknown>,
  token = 'valid-token'
): Request {
  return new Request('http://localhost/api/delivery/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/delivery/create', () => {
  beforeEach(() => {
    jest.resetModules()
    authUser = { id: 'seller-1' }
    authError = null
    orderData = {
      id: 'order-1',
      user_id: 'buyer-1',
      status: 'paid',
      buyer_full_name: 'Test Buyer',
      buyer_phone: '0201234567',
      delivery_address: '123 Main St',
      delivery_city: 'Accra',
      delivery_notes: '',
      dawurobo_order_id: null,
    }
    orderError = null
    sellerItemsData = [{ id: 'item-1', title_snapshot: 'iPhone 15', quantity: 1 }]
    sellerProfileData = {
      username: 'selleruser',
      phone: '0551234567',
      address: '456 Seller Ave, Kumasi',
    }
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ id: 'drb-order-123', status: 'pending' })),
      json: () => Promise.resolve({ id: 'drb-order-123', status: 'pending' }),
    })
  })

  it('returns 401 when no Authorization header', async () => {
    const { POST } = await import('@/app/api/delivery/create/route')
    const req = new Request('http://localhost/api/delivery/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: 'order-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    authUser = null
    authError = { message: 'Invalid token' }
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }, 'bad-token'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when order_id is missing', async () => {
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/order_id/i)
  })

  it('returns 404 when order does not exist', async () => {
    orderData = null
    orderError = { message: 'Not found' }
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'bad-order' }))
    expect(res.status).toBe(404)
  })

  it('returns 400 when order status is not paid', async () => {
    (orderData as Record<string, unknown>).status = 'pending'
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/paid/i)
  })

  it('returns 409 when delivery already dispatched', async () => {
    (orderData as Record<string, unknown>).dawurobo_order_id = 'existing-drb-id'
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already dispatched/i)
  })

  it('returns 403 when seller has no items in the order', async () => {
    sellerItemsData = []
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/items/i)
  })

  it('returns 400 when seller profile has no address', async () => {
    sellerProfileData = { username: 'selleruser', phone: '0551234567', address: '' }
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/pickup address/i)
  })

  it('returns 400 when order is missing delivery address', async () => {
    (orderData as Record<string, unknown>).delivery_address = null
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/delivery address/i)
  })

  it('returns 400 when order is missing buyer phone', async () => {
    (orderData as Record<string, unknown>).buyer_phone = null
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/buyer phone/i)
  })

  it('returns 200 with dawurobo_order_id on success', async () => {
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.dawurobo_order_id).toBe('drb-order-123')
  })

  it('calls Dawurobo with correct pickup and dropoff details', async () => {
    const { POST } = await import('@/app/api/delivery/create/route')
    await POST(makeRequest({ order_id: 'order-1' }))
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/orders'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Api-Key': 'mock-dawurobo-key' }),
      })
    )
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.pickup.address).toBe('456 Seller Ave, Kumasi')
    expect(body.dropoff.address).toBe('123 Main St')
    expect(body.dropoff.contact_phone).toBe('0201234567')
  })

  it('returns 502 when Dawurobo API call fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
      json: () => Promise.reject(new Error('not json')),
    })
    const { POST } = await import('@/app/api/delivery/create/route')
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(502)
  })
})
