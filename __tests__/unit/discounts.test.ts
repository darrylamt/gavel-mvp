import {
  normalizeDiscountCode,
  calculateDiscountAmount,
  resolveDiscountCode,
} from '@/lib/discounts'
import type { DiscountCodeRow } from '@/lib/discounts'

// ─── normalizeDiscountCode ────────────────────────────────────────────────────

describe('normalizeDiscountCode', () => {
  it('uppercases and trims input', () => {
    expect(normalizeDiscountCode('  hello  ')).toBe('HELLO')
  })

  it('handles already uppercase input', () => {
    expect(normalizeDiscountCode('SAVE20')).toBe('SAVE20')
  })

  it('returns empty string for null', () => {
    expect(normalizeDiscountCode(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(normalizeDiscountCode(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(normalizeDiscountCode('')).toBe('')
  })

  it('handles mixed case with spaces', () => {
    expect(normalizeDiscountCode('  Save20  ')).toBe('SAVE20')
  })
})

// ─── calculateDiscountAmount ──────────────────────────────────────────────────

describe('calculateDiscountAmount', () => {
  it('calculates 20% off GHS 100 = 20.00', () => {
    expect(calculateDiscountAmount(100, 20)).toBe(20)
  })

  it('returns 0 for 0% off', () => {
    expect(calculateDiscountAmount(100, 0)).toBe(0)
  })

  it('returns full amount for 100% off', () => {
    expect(calculateDiscountAmount(100, 100)).toBe(100)
  })

  it('clamps negative subtotal to 0', () => {
    expect(calculateDiscountAmount(-50, 20)).toBe(0)
  })

  it('clamps percentOff > 100 to 100', () => {
    expect(calculateDiscountAmount(100, 150)).toBe(100)
  })

  it('handles non-integer percentages correctly', () => {
    expect(calculateDiscountAmount(33.33, 10)).toBe(3.33)
  })

  it('returns 0 for NaN subtotal', () => {
    expect(calculateDiscountAmount(NaN, 10)).toBe(0)
  })

  it('returns 0 for NaN percentOff', () => {
    expect(calculateDiscountAmount(100, NaN)).toBe(0)
  })

  it('calculates 15% of GHS 200 = 30.00', () => {
    expect(calculateDiscountAmount(200, 15)).toBe(30)
  })
})

// ─── resolveDiscountCode ──────────────────────────────────────────────────────

function makeMockSupabase(data: DiscountCodeRow | null, error: { message: string } | null = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  }
  return { from: jest.fn(() => chain) }
}

describe('resolveDiscountCode', () => {
  it('returns error for empty string', async () => {
    const supabase = makeMockSupabase(null)
    const result = await resolveDiscountCode(supabase as any, '')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/enter a discount code/i)
  })

  it('returns error for whitespace-only input', async () => {
    const supabase = makeMockSupabase(null)
    const result = await resolveDiscountCode(supabase as any, '   ')
    expect(result.ok).toBe(false)
  })

  it('returns error for inactive code', async () => {
    const row: DiscountCodeRow = {
      id: '1', code: 'SAVE10', percent_off: 10,
      max_uses: null, used_count: 0, ends_at: null, is_active: false,
    }
    const supabase = makeMockSupabase(row)
    const result = await resolveDiscountCode(supabase as any, 'SAVE10')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/invalid or inactive/i)
  })

  it('returns error for non-existent code', async () => {
    const supabase = makeMockSupabase(null)
    const result = await resolveDiscountCode(supabase as any, 'FAKE99')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/invalid or inactive/i)
  })

  it('returns error for expired code', async () => {
    const row: DiscountCodeRow = {
      id: '1', code: 'EXPIRED', percent_off: 10,
      max_uses: null, used_count: 0,
      ends_at: new Date(Date.now() - 1000).toISOString(),
      is_active: true,
    }
    const supabase = makeMockSupabase(row)
    const result = await resolveDiscountCode(supabase as any, 'EXPIRED')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/expired/i)
  })

  it('returns error when usage limit reached', async () => {
    const row: DiscountCodeRow = {
      id: '1', code: 'MAXED', percent_off: 10,
      max_uses: 5, used_count: 5, ends_at: null, is_active: true,
    }
    const supabase = makeMockSupabase(row)
    const result = await resolveDiscountCode(supabase as any, 'MAXED')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/usage limit/i)
  })

  it('returns ok: true for valid code', async () => {
    const row: DiscountCodeRow = {
      id: '1', code: 'SAVE10', percent_off: 10,
      max_uses: 100, used_count: 3,
      ends_at: new Date(Date.now() + 86400000).toISOString(),
      is_active: true,
    }
    const supabase = makeMockSupabase(row)
    const result = await resolveDiscountCode(supabase as any, 'save10')  // lowercase input
    expect(result.ok).toBe(true)
    expect(result.code).toBe('SAVE10')
    expect(result.row?.percent_off).toBe(10)
  })

  it('passes through database errors', async () => {
    const supabase = makeMockSupabase(null, { message: 'DB connection error' })
    const result = await resolveDiscountCode(supabase as any, 'SAVE10')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('DB connection error')
  })

  it('accepts code with max_uses=null (unlimited)', async () => {
    const row: DiscountCodeRow = {
      id: '1', code: 'UNLIMITED', percent_off: 20,
      max_uses: null, used_count: 9999, ends_at: null, is_active: true,
    }
    const supabase = makeMockSupabase(row)
    const result = await resolveDiscountCode(supabase as any, 'UNLIMITED')
    expect(result.ok).toBe(true)
  })
})
