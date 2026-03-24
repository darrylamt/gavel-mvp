/**
 * Tests for POST /api/search
 * Source: src/app/api/search/route.ts
 */

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'

// ── Per-test overrides ────────────────────────────────────────────────────────
let rpcResults: unknown[] | null = []
let rpcError: unknown = null
let auctionResults: unknown[] = []
let productResults: unknown[] = []
let embeddingError: boolean = false

// ── Mock: embeddings ──────────────────────────────────────────────────────────
jest.mock('@/lib/embeddings', () => ({
  generateEmbedding: jest.fn().mockImplementation(async () => {
    if (embeddingError) throw new Error('Embedding service unavailable')
    return new Array(1536).fill(0.1)
  }),
}))

// ── Mock: Supabase ────────────────────────────────────────────────────────────
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn().mockImplementation(async () => ({
      data: rpcResults,
      error: rpcError,
    })),
    from: jest.fn((table: string) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: table === 'auctions' ? auctionResults : productResults,
            error: null,
          })
        ),
      }
      return chain
    }),
  })),
}))

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/search', () => {
  beforeEach(() => {
    rpcResults = []
    rpcError = null
    auctionResults = []
    productResults = []
    embeddingError = false
  })

  it('returns empty results for empty query', async () => {
    const { POST } = await import('@/app/api/search/route')
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual([])
  })

  it('returns empty results for whitespace-only query', async () => {
    const { POST } = await import('@/app/api/search/route')
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '   ' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual([])
  })

  it('returns semantic search results when rpc succeeds', async () => {
    const { POST } = await import('@/app/api/search/route')
    rpcResults = [
      { id: 'a1', title: 'Laptop', type: 'auction', price: 500, similarity: 0.9 },
      { id: 'p1', title: 'Laptop Bag', type: 'product', price: 50, similarity: 0.75 },
    ]
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'laptop' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results.length).toBe(2)
    expect(json.results[0].title).toBe('Laptop')
  })

  it('falls back to text search when embedding fails', async () => {
    const { POST } = await import('@/app/api/search/route')
    embeddingError = true
    auctionResults = [{ id: 'a1', title: 'iPhone', current_price: 800, image_url: null, images: [] }]
    productResults = [{ id: 'p1', title: 'iPhone Case', price: 20, image_url: null, image_urls: [], category: 'Electronics' }]
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'iphone' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results.length).toBe(2)
  })

  it('falls back to text search when rpc returns empty results', async () => {
    const { POST } = await import('@/app/api/search/route')
    rpcResults = [] // Semantic search returns nothing
    auctionResults = [{ id: 'a1', title: 'Couch', current_price: 300, image_url: null, images: [] }]
    productResults = []
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'couch' }),
    })
    const res = await POST(req)
    const json = await res.json()
    expect(json.results.length).toBeGreaterThan(0)
    expect(json.results[0].title).toBe('Couch')
  })

  it('limits results to 20', async () => {
    const { POST } = await import('@/app/api/search/route')
    rpcResults = Array.from({ length: 25 }, (_, i) => ({
      id: `r${i}`, title: `Item ${i}`, type: 'product', price: 100, similarity: 0.8,
    }))
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'item' }),
    })
    const res = await POST(req)
    const json = await res.json()
    expect(json.results.length).toBeLessThanOrEqual(20)
  })

  it('handles special characters without throwing', async () => {
    const { POST } = await import('@/app/api/search/route')
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: "'; DROP TABLE--" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns noResults:true when no results found', async () => {
    const { POST } = await import('@/app/api/search/route')
    rpcResults = []
    auctionResults = []
    productResults = []
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'xyznonexistent' }),
    })
    const res = await POST(req)
    const json = await res.json()
    expect(json.noResults).toBe(true)
  })
})
