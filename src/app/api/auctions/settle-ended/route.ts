import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

/**
 * GET /api/auctions/settle-ended
 *
 * Cron job: finds every auction whose ends_at has passed but tokens haven't
 * been refunded yet, then calls /api/auctions/close for each one.
 *
 * Must be called with Authorization: Bearer <CRON_SECRET>
 * Schedule in vercel.json: every 15 minutes.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BID_TOKEN_COST = 1

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  // Find auctions that have passed their end time but aren't fully settled.
  // "Settled" means we've already written at least one refund:auction:{id} entry,
  // OR the auction had no bids at all. We use a simple proxy: status != 'active'
  // and ends_at < now. We'll let the close logic handle idempotency.
  const { data: endedAuctions, error } = await supabase
    .from('auctions')
    .select('id, title, ends_at, status')
    .lt('ends_at', nowIso)
    .in('status', ['active', 'scheduled'])   // not yet marked ended
    .order('ends_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[settle-ended] failed to fetch auctions:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // Also grab auctions already marked 'ended' that may not have had refunds issued
  // (e.g. they were closed by a user visit before the idempotency fix).
  // Check: any 'ended' auction with bids but no refund transaction yet.
  const { data: endedNoRefund } = await supabase
    .from('auctions')
    .select('id, title, ends_at, status')
    .lt('ends_at', nowIso)
    .eq('status', 'ended')
    .order('ends_at', { ascending: true })
    .limit(50)

  const toSettle = [
    ...(endedAuctions ?? []),
    ...(endedNoRefund ?? []),
  ]

  if (toSettle.length === 0) {
    return NextResponse.json({ settled: 0, message: 'Nothing to settle' })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
  const results: { id: string; result: string }[] = []

  for (const auction of toSettle) {
    // For each ended auction, run the same refund logic as /api/auctions/close
    // but inline here so we don't need an HTTP round-trip.
    try {
      const refundKey = `refund:auction:${auction.id}`

      // Check idempotency
      const { data: existingRefunds } = await supabase
        .from('token_transactions')
        .select('id')
        .eq('type', 'refund')
        .eq('reference', refundKey)
        .limit(1)

      if (existingRefunds && existingRefunds.length > 0) {
        results.push({ id: auction.id, result: 'already_refunded' })
        continue
      }

      // Ensure status is marked ended
      if (auction.status !== 'ended') {
        await supabase.from('auctions').update({ status: 'ended' }).eq('id', auction.id)
      }

      // Get all bids
      const { data: allBids } = await supabase
        .from('bids')
        .select('id, user_id')
        .eq('auction_id', auction.id)

      if (!allBids || allBids.length === 0) {
        results.push({ id: auction.id, result: 'no_bids' })
        continue
      }

      // Determine winning bid (highest amount that meets reserve, if any)
      const { data: auctionFull } = await supabase
        .from('auctions')
        .select('winning_bid_id, reserve_price')
        .eq('id', auction.id)
        .single()

      let winningUserId: string | null = null
      if (auctionFull?.winning_bid_id) {
        const { data: winBid } = await supabase
          .from('bids')
          .select('user_id')
          .eq('id', auctionFull.winning_bid_id)
          .single()
        winningUserId = winBid?.user_id ?? null
      }

      // Count bids per user
      const bidCountByUser = new Map<string, number>()
      for (const bid of allBids) {
        bidCountByUser.set(bid.user_id, (bidCountByUser.get(bid.user_id) ?? 0) + 1)
      }

      // Refund losing bidders
      let refundCount = 0
      for (const [userId, bidCount] of bidCountByUser.entries()) {
        if (userId === winningUserId) continue

        const refundAmount = bidCount * BID_TOKEN_COST

        const { data: profile } = await supabase
          .from('profiles')
          .select('token_balance')
          .eq('id', userId)
          .single()

        if (!profile) continue

        await supabase
          .from('profiles')
          .update({ token_balance: (profile.token_balance ?? 0) + refundAmount })
          .eq('id', userId)

        await supabase.from('token_transactions').insert({
          user_id: userId,
          amount: refundAmount,
          type: 'refund',
          reference: refundKey,
        })

        refundCount++
      }

      // Restore linked shop product if no winner
      if (refundCount > 0 || allBids.length === 0) {
        const { data: auctionLink } = await supabase
          .from('auctions')
          .select('shop_product_id, winning_bid_id')
          .eq('id', auction.id)
          .single()

        if (auctionLink?.shop_product_id && !auctionLink.winning_bid_id) {
          await supabase
            .from('shop_products')
            .update({ status: 'active' })
            .eq('id', auctionLink.shop_product_id)
        }
      }

      results.push({ id: auction.id, result: `refunded_${refundCount}_users` })
    } catch (err) {
      console.error(`[settle-ended] failed for auction ${auction.id}:`, err)
      results.push({ id: auction.id, result: 'error' })
    }
  }

  console.log('[settle-ended] completed:', results)
  return NextResponse.json({ settled: results.length, results })
}
