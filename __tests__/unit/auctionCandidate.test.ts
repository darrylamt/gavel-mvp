import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'

const ONE_HOUR_MS = 60 * 60 * 1000

/** Helper to create a past timestamp */
const past = (msAgo = 10000) => new Date(Date.now() - msAgo).toISOString()
/** Helper to create a future timestamp */
const future = (msAhead = 10000) => new Date(Date.now() + msAhead).toISOString()

function buildSupabaseMock(auctionRow: Record<string, unknown>, bids: Record<string, unknown>[] = []) {
  const auctionChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: auctionRow, error: null }),
  }
  // The source code chains two .order() calls and directly awaits the result.
  // We make the chain a "thenable" so `await chain` resolves to the bids data.
  const bidsChain: Record<string, unknown> & PromiseLike<{ data: typeof bids; error: null }> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: (
      resolve: (value: { data: typeof bids; error: null }) => void,
      reject: (err: unknown) => void
    ) => Promise.resolve({ data: bids, error: null }).then(resolve, reject),
  }
  const updateChain = {
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    from: jest.fn((table: string) => {
      if (table === 'auctions') {
        // Distinguish select vs update by checking call order
        return {
          ...auctionChain,
          update: jest.fn(() => updateChain),
        }
      }
      if (table === 'bids') return bidsChain
      return auctionChain
    }),
  }
}

describe('resolveAuctionPaymentCandidate', () => {
  it('returns auction_not_ended when ends_at is in the future and status is not ended', async () => {
    const supabase = buildSupabaseMock({
      id: 'a1', status: 'active', ends_at: future(),
      paid: false, reserve_price: null, winning_bid_id: null,
      winner_id: null, auction_payment_due_at: null, starting_price: 100,
      starts_at: past(100000),
    })
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    expect(result.reason).toBe('auction_not_ended')
    expect(result.activeCandidate).toBeNull()
  })

  it('returns already_paid when auction.paid is true', async () => {
    const dueAt = future()
    const supabase = buildSupabaseMock({
      id: 'a1', status: 'ended', ends_at: past(),
      paid: true, reserve_price: null, winning_bid_id: 'bid1',
      winner_id: 'user1', auction_payment_due_at: dueAt, starting_price: 100,
      starts_at: past(100000),
    })
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    expect(result.reason).toBe('already_paid')
    expect(result.activeCandidate).toBeNull()
    expect(result.paymentDueAt).toBe(dueAt)
  })

  it('returns no_eligible_bids when there are no bids', async () => {
    const supabase = buildSupabaseMock(
      {
        id: 'a1', status: 'ended', ends_at: past(),
        paid: false, reserve_price: null, winning_bid_id: null,
        winner_id: null, auction_payment_due_at: null, starting_price: 100,
        starts_at: past(100000),
      },
      [] // empty bids
    )
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    expect(result.reason).toBe('no_eligible_bids')
    expect(result.activeCandidate).toBeNull()
  })

  it('returns no_eligible_bids when all bids are below reserve price', async () => {
    const supabase = buildSupabaseMock(
      {
        id: 'a1', status: 'ended', ends_at: past(),
        paid: false, reserve_price: 500, winning_bid_id: null,
        winner_id: null, auction_payment_due_at: null, starting_price: 100,
        starts_at: past(100000),
      },
      [
        { id: 'bid1', amount: 200, user_id: 'user1', created_at: past(5000) },
        { id: 'bid2', amount: 300, user_id: 'user2', created_at: past(4000) },
      ]
    )
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    expect(result.reason).toBe('no_eligible_bids')
  })

  it('returns ok with rank-1 candidate when auction has eligible bids', async () => {
    const supabase = buildSupabaseMock(
      {
        id: 'a1', status: 'ended', ends_at: past(),
        paid: false, reserve_price: 100, winning_bid_id: null,
        winner_id: null, auction_payment_due_at: null, starting_price: 50,
        starts_at: past(100000),
      },
      [
        { id: 'bid1', amount: 500, user_id: 'user1', created_at: past(5000) },
        { id: 'bid2', amount: 300, user_id: 'user2', created_at: past(4000) },
      ]
    )
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    expect(result.reason).toBe('ok')
    expect(result.activeCandidate).not.toBeNull()
    expect(result.activeCandidate?.rank).toBe(1)
    expect(result.activeCandidate?.bidId).toBe('bid1')
    expect(result.activeCandidate?.userId).toBe('user1')
  })

  it('paymentDueAt is approximately 1 hour from now', async () => {
    const before = Date.now()
    const supabase = buildSupabaseMock(
      {
        id: 'a1', status: 'ended', ends_at: past(),
        paid: false, reserve_price: null, winning_bid_id: null,
        winner_id: null, auction_payment_due_at: null, starting_price: 50,
        starts_at: past(100000),
      },
      [{ id: 'bid1', amount: 200, user_id: 'user1', created_at: past(5000) }]
    )
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    const after = Date.now()

    expect(result.paymentDueAt).not.toBeNull()
    const dueMs = new Date(result.paymentDueAt!).getTime()
    expect(dueMs).toBeGreaterThanOrEqual(before + ONE_HOUR_MS)
    expect(dueMs).toBeLessThanOrEqual(after + ONE_HOUR_MS + 100)
  })

  it('returns no_eligible_bids when payment window has expired', async () => {
    // winning_bid_id is set but auction_payment_due_at is in the past
    const expiredDueAt = past(5000)
    const supabase = buildSupabaseMock(
      {
        id: 'a1', status: 'ended', ends_at: past(70000),
        paid: false, reserve_price: null, winning_bid_id: 'bid1',
        winner_id: null, auction_payment_due_at: expiredDueAt, starting_price: 50,
        starts_at: past(200000),
      },
      [{ id: 'bid1', amount: 200, user_id: 'user1', created_at: past(60000) }]
    )
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    // Payment window expired → clearCandidate called → no_eligible_bids
    expect(result.reason).toBe('no_eligible_bids')
    expect(result.activeCandidate).toBeNull()
  })

  it('accepts bid exactly at reserve price', async () => {
    const supabase = buildSupabaseMock(
      {
        id: 'a1', status: 'ended', ends_at: past(),
        paid: false, reserve_price: 200, winning_bid_id: null,
        winner_id: null, auction_payment_due_at: null, starting_price: 100,
        starts_at: past(100000),
      },
      [{ id: 'bid1', amount: 200, user_id: 'user1', created_at: past(5000) }]
    )
    const result = await resolveAuctionPaymentCandidate(supabase as any, 'a1')
    expect(result.reason).toBe('ok')
    expect(result.activeCandidate?.bidId).toBe('bid1')
  })
})
