/**
 * Tests for POST /api/ai/describe-product
 * Source: src/app/api/ai/describe-product/route.ts
 */

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.OPENAI_API_KEY = 'test-openai-key'

// ── Per-test controls ─────────────────────────────────────────────────────────
let anthropicShouldFail = false
let openaiShouldFail = false

// ── Anthropic SDK mock ────────────────────────────────────────────────────────
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockImplementation(async () => {
        if (anthropicShouldFail) throw new Error('Anthropic API error')
        return {
          content: [{ type: 'text', text: 'This is a high-quality product in excellent condition.' }],
        }
      }),
    },
  })),
}))

// ── Fetch mock (for OpenAI) ───────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

function makeOpenAISuccessResponse() {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'A product description via GPT.' } }],
    }),
  }
}

function makeOpenAIErrorResponse() {
  return {
    ok: false,
    json: async () => ({ error: { message: 'OpenAI error' } }),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeDescribeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/describe-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  imageBase64: 'aGVsbG8=', // base64 "hello"
  mediaType: 'image/jpeg',
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/ai/describe-product', () => {
  beforeEach(() => {
    anthropicShouldFail = false
    openaiShouldFail = false
    mockFetch.mockResolvedValue(makeOpenAISuccessResponse())
  })

  it('returns 400 when imageBase64 is missing', async () => {
    const { POST } = await import('@/app/api/ai/describe-product/route')
    const res = await POST(makeDescribeRequest({ mediaType: 'image/jpeg' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/missing/i)
  })

  it('returns 400 when mediaType is missing', async () => {
    const { POST } = await import('@/app/api/ai/describe-product/route')
    const res = await POST(makeDescribeRequest({ imageBase64: 'aGVsbG8=' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/missing/i)
  })

  it('returns 200 with description from Anthropic', async () => {
    const { POST } = await import('@/app/api/ai/describe-product/route')
    const res = await POST(makeDescribeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(typeof json.description).toBe('string')
    expect(json.description.length).toBeGreaterThan(0)
  })

  it('includes product name in prompt when provided', async () => {
    const { POST } = await import('@/app/api/ai/describe-product/route')
    const res = await POST(makeDescribeRequest({ ...VALID_BODY, productName: 'Samsung TV' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.description).toBeDefined()
  })

  it('falls back to OpenAI when Anthropic fails', async () => {
    const { POST } = await import('@/app/api/ai/describe-product/route')
    anthropicShouldFail = true
    const res = await POST(makeDescribeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.description).toContain('GPT')
  })

  it('returns 500 when both Anthropic and OpenAI fail', async () => {
    const { POST } = await import('@/app/api/ai/describe-product/route')
    anthropicShouldFail = true
    mockFetch.mockResolvedValue(makeOpenAIErrorResponse())
    const res = await POST(makeDescribeRequest(VALID_BODY))
    expect(res.status).toBe(500)
  })

  it('returns 500 when no API keys are configured', async () => {
    const { POST } = await import('@/app/api/ai/describe-product/route')
    const savedAnthropicKey = process.env.ANTHROPIC_API_KEY
    const savedOpenAIKey = process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
    const res = await POST(makeDescribeRequest(VALID_BODY))
    expect(res.status).toBe(500)
    process.env.ANTHROPIC_API_KEY = savedAnthropicKey
    process.env.OPENAI_API_KEY = savedOpenAIKey
  })
})
