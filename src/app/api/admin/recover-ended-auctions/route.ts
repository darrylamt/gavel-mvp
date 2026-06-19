import { NextResponse } from 'next/server'
import 'server-only'
import { requireAdmin } from '@/lib/serverAdminAuth'
import { refundLosingBidders, sendAuctionClosedNotifications } from '@/lib/auctionSettlement'

/**
 * POST /api/admin/recover-ended-auctions   (ADMIN ONLY — one-time recovery tool)
 *
 * Repairs auctions that ended with real bids but were left with no winner due to
 * the historical settlement bug (cron marked them `ended` without ever assigning
 * a winner; the page-side fallback was then blocked by the `status === 'ended'`
 * guard). It targets ONLY no-reserve auctions, because an auction whose reserve
 * was not met is *correctly* winner-less and must not be force-sold.
 *
 * For each target it: assigns the top bidder as winner, sets winning_bid_id +
 * current_price, opens a fresh 48h payment window, refunds losing bidders
 * (idempotent), and notifies the winner (SMS + in-app + email) and the seller.
 *
 * Safe to run more than once (winner_id IS NULL filter + idempotent refunds/
 * notifications), but it is intended as a one-shot: DELETE this route afterwards.
 *
 * Usage:
 *   POST {}                       → DRY RUN, returns the list it WOULD recover.
 *   POST { "confirm": true }      → performs the recovery.
 */

const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000

type StuckAuction = {
  id: string
  title: string | null
  seller_id: string | null
  reserve_price: number | null
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.error
  const supabase = auth.service

  let confirm = false
  try {
    const body = await req.json()
    confirm = body?.confirm === true
  } catch {
    // empty body → dry run
  }

  // No-reserve, ended, unpaid auctions that never got a winner assigned.
  const { data: candidates, error } = await supabase
    .from('auctions')
    .select('id, title, seller_id, reserve_price')
    .eq('status', 'ended')
    .eq('paid', false)
    .is('reserve_price', null)
    .is('winner_id', null)
    .returns<StuckAuction[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const nowMs = Date.now()
  const results: Array<Record<string, unknown>> = []

  for (const auction of candidates ?? []) {
    // Highest bid wins (earliest on ties). No reserve, so any bid is eligible.
    const { data: topBid } = await supabase
      .from('bids')
      .select('id, user_id, amount')
      .eq('auction_id', auction.id)
      .order('amount', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string; user_id: string; amount: number }>()

    if (!topBid) {
      results.push({ id: auction.id, title: auction.title, action: 'skipped_no_bids' })
      continue
    }

    const winnerAmount = Number(topBid.amount)
    const paymentDueAt = new Date(nowMs + PAYMENT_WINDOW_MS).toISOString()

    if (!confirm) {
      results.push({
        id: auction.id,
        title: auction.title,
        action: 'would_recover',
        winner_id: topBid.user_id,
        winning_bid_id: topBid.id,
        winning_amount: winnerAmount,
        payment_due_at: paymentDueAt,
      })
      continue
    }

    // 1. Assign the winner + open a fresh 48h payment window.
    const { error: updateError } = await supabase
      .from('auctions')
      .update({
        status: 'ended',
        winner_id: topBid.user_id,
        winning_bid_id: topBid.id,
        current_price: winnerAmount,
        auction_payment_due_at: paymentDueAt,
      })
      .eq('id', auction.id)

    if (updateError) {
      results.push({ id: auction.id, title: auction.title, action: 'error', error: updateError.message })
      continue
    }

    // 2. Refund losing bidders (idempotent).
    const { refundedUsers } = await refundLosingBidders(supabase, auction.id, topBid.user_id)

    // 3. Notify winner (SMS + in-app + email) and seller.
    await sendAuctionClosedNotifications(supabase, {
      auctionId: auction.id,
      auctionTitle: auction.title || 'Auction',
      sellerId: auction.seller_id,
      winnerUserId: topBid.user_id,
      winnerAmount,
      reserveMet: true,
      sendEmails: true,
    })

    console.log(`[recover-ended-auctions] recovered ${auction.id} → winner=${topBid.user_id} amount=${winnerAmount} refunded=${refundedUsers}`)

    results.push({
      id: auction.id,
      title: auction.title,
      action: 'recovered',
      winner_id: topBid.user_id,
      winning_bid_id: topBid.id,
      winning_amount: winnerAmount,
      payment_due_at: paymentDueAt,
      losing_bidders_refunded: refundedUsers,
    })
  }

  return NextResponse.json({
    mode: confirm ? 'applied' : 'dry_run',
    count: results.length,
    results,
  })
}
