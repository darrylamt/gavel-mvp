import type { SupabaseClient } from '@supabase/supabase-js'
import 'server-only'

const ONE_HOUR_MS = 60 * 60 * 1000

type AuctionSettlementRow = {
  id: string
  status: string | null
  ends_at: string | null
  paid: boolean
  reserve_price: number | null
  winning_bid_id: string | null
  winner_id: string | null
  auction_payment_due_at: string | null
}

type BidRow = {
  id: string
  amount: number
  user_id: string
  created_at: string
}

export type AuctionPaymentCandidate = {
  bidId: string
  userId: string
  amount: number
  rank: number
}

export type CandidateResolution = {
  auction: AuctionSettlementRow
  activeCandidate: AuctionPaymentCandidate | null
  paymentDueAt: string | null
  reason:
    | 'ok'
    | 'auction_not_ended'
    | 'already_paid'
    | 'no_eligible_bids'
}

function isMissingColumnError(message: string) {
  const normalized = message.toLowerCase()
  return (
    (normalized.includes('column') && normalized.includes('does not exist')) ||
    (normalized.includes('could not find') && normalized.includes('column')) ||
    normalized.includes('in the schema cache')
  )
}

async function loadAuction(
  supabase: SupabaseClient,
  auctionId: string
): Promise<AuctionSettlementRow> {
  const { data, error } = await supabase
    .from('auctions')
    .select(
      'id, status, ends_at, paid, reserve_price, winning_bid_id, winner_id, auction_payment_due_at'
    )
    .eq('id', auctionId)
    .single()

  if (error && isMissingColumnError(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('auctions')
      .select('id, status, ends_at, paid, reserve_price, winning_bid_id')
      .eq('id', auctionId)
      .single()

    if (fallbackError || !fallbackData) {
      throw new Error('Auction not found')
    }

    return {
      ...(fallbackData as Omit<AuctionSettlementRow, 'winner_id' | 'auction_payment_due_at'>),
      winner_id: null,
      auction_payment_due_at: null,
    }
  }

  if (error) {
    throw new Error(`Failed to load auction: ${error.message}`)
  }

  if (!data) {
    throw new Error('Auction not found')
  }

  return data as AuctionSettlementRow
}

async function listEligibleBids(
  supabase: SupabaseClient,
  auctionId: string,
  reservePrice: number | null
): Promise<BidRow[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('id, amount, user_id, created_at')
    .eq('auction_id', auctionId)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('Failed to fetch bids')
  }

  const seenUsers = new Set<string>()
  const eligible: BidRow[] = []
  const reserveThreshold = reservePrice == null ? null : Number(reservePrice)

  for (const bid of (data ?? []) as BidRow[]) {
    const bidAmount = Number(bid.amount)

    if (!bid.user_id || seenUsers.has(bid.user_id)) continue
    if (!Number.isFinite(bidAmount)) continue
    if (
      reserveThreshold != null &&
      Number.isFinite(reserveThreshold) &&
      bidAmount + Number.EPSILON < reserveThreshold
    ) {
      continue
    }

    seenUsers.add(bid.user_id)
    eligible.push(bid)
  }

  return eligible
}

async function persistActiveCandidate(
  supabase: SupabaseClient,
  auctionId: string,
  candidateBidId: string,
  paymentDueAt: string
) {
  const { error } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      winning_bid_id: candidateBidId,
      winner_id: null,
      auction_payment_due_at: paymentDueAt,
    })
    .eq('id', auctionId)

  if (error && isMissingColumnError(error.message)) {
    const { error: fallbackError } = await supabase
      .from('auctions')
      .update({
        status: 'ended',
        winning_bid_id: candidateBidId,
      })
      .eq('id', auctionId)

    if (fallbackError) {
      throw new Error(`Failed to persist active candidate: ${fallbackError.message}`)
    }

    return
  }

  if (error) {
    throw new Error(`Failed to persist active candidate: ${error.message}`)
  }
}

async function clearCandidate(
  supabase: SupabaseClient,
  auctionId: string
) {
  const { error } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      winning_bid_id: null,
      winner_id: null,
      auction_payment_due_at: null,
    })
    .eq('id', auctionId)

  if (error && isMissingColumnError(error.message)) {
    const { error: fallbackError } = await supabase
      .from('auctions')
      .update({
        status: 'ended',
        winning_bid_id: null,
      })
      .eq('id', auctionId)

    if (fallbackError) {
      throw new Error(`Failed to clear candidate: ${fallbackError.message}`)
    }

    return
  }

  if (error) {
    throw new Error(`Failed to clear candidate: ${error.message}`)
  }
}

export async function resolveAuctionPaymentCandidate(
  supabase: SupabaseClient,
  auctionId: string
): Promise<CandidateResolution> {
  const nowMs = Date.now()
  let auction = await loadAuction(supabase, auctionId)

  const endedByTime = auction.ends_at
    ? new Date(auction.ends_at).getTime() <= nowMs
    : false

  if (auction.status !== 'ended' && !endedByTime) {
    return {
      auction,
      activeCandidate: null,
      paymentDueAt: null,
      reason: 'auction_not_ended',
    }
  }

  if (auction.status !== 'ended') {
    const { error } = await supabase
      .from('auctions')
      .update({ status: 'ended' })
      .eq('id', auctionId)

    if (error) {
      throw new Error('Failed to mark auction ended')
    }

    auction = { ...auction, status: 'ended' }
  }

  if (auction.paid) {
    return {
      auction,
      activeCandidate: null,
      paymentDueAt: auction.auction_payment_due_at,
      reason: 'already_paid',
    }
  }

  const eligibleBids = await listEligibleBids(supabase, auctionId, auction.reserve_price)

  if (eligibleBids.length === 0) {
    if (auction.winning_bid_id || auction.auction_payment_due_at || auction.winner_id) {
      await clearCandidate(supabase, auctionId)
    }

    return {
      auction,
      activeCandidate: null,
      paymentDueAt: null,
      reason: 'no_eligible_bids',
    }
  }

  const buildCandidate = (index: number): AuctionPaymentCandidate => {
    const bid = eligibleBids[index]

    return {
      bidId: bid.id,
      userId: bid.user_id,
      amount: Number(bid.amount),
      rank: index + 1,
    }
  }

  const winnerIndex = auction.winning_bid_id
    ? eligibleBids.findIndex((bid) => bid.id === auction.winning_bid_id)
    : -1

  if (winnerIndex < 0) {
    const paymentDueAt = new Date(nowMs + ONE_HOUR_MS).toISOString()
    const candidate = buildCandidate(0)

    await persistActiveCandidate(supabase, auctionId, candidate.bidId, paymentDueAt)

    return {
      auction,
      activeCandidate: candidate,
      paymentDueAt,
      reason: 'ok',
    }
  }

  const currentCandidate = buildCandidate(winnerIndex)

  if (!auction.auction_payment_due_at) {
    const paymentDueAt = new Date(nowMs + ONE_HOUR_MS).toISOString()

    await persistActiveCandidate(supabase, auctionId, currentCandidate.bidId, paymentDueAt)

    return {
      auction,
      activeCandidate: currentCandidate,
      paymentDueAt,
      reason: 'ok',
    }
  }

  const dueAtMs = new Date(auction.auction_payment_due_at).getTime()

  if (Number.isFinite(dueAtMs) && dueAtMs > nowMs) {
    return {
      auction,
      activeCandidate: currentCandidate,
      paymentDueAt: auction.auction_payment_due_at,
      reason: 'ok',
    }
  }

  const nextCandidateIndex = winnerIndex + 1
  if (nextCandidateIndex >= eligibleBids.length) {
    await clearCandidate(supabase, auctionId)

    return {
      auction,
      activeCandidate: null,
      paymentDueAt: null,
      reason: 'no_eligible_bids',
    }
  }

  const paymentDueAt = new Date(nowMs + ONE_HOUR_MS).toISOString()
  const nextCandidate = buildCandidate(nextCandidateIndex)

  await persistActiveCandidate(supabase, auctionId, nextCandidate.bidId, paymentDueAt)

  return {
    auction,
    activeCandidate: nextCandidate,
    paymentDueAt,
    reason: 'ok',
  }
}