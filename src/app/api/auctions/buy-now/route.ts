import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

/**
 * POST /api/auctions/buy-now
 * Body: { auction_id: string }
 * Auth: Bearer token
 *
 * Allows a user to purchase an auction item at its buy_now_price BEFORE the
 * auction starts (while status = 'scheduled'). This immediately:
 *  1. Inserts a bid at buy_now_price
 *  2. Marks auction ended, sets winning_bid_id, auction_payment_due_at (1hr)
 *  3. Returns { payPath } so the client can redirect to /pay/{id}
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ONE_HOUR_MS = 60 * 60 * 1000

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Parse body ────────────────────────────────────────────────────────────
  const { auction_id } = await req.json() as { auction_id?: string }
  if (!auction_id) return NextResponse.json({ error: 'auction_id required' }, { status: 400 })

  // ── Load auction ──────────────────────────────────────────────────────────
  const { data: auction, error: loadErr } = await supabase
    .from('auctions')
    .select('id, status, starts_at, ends_at, buy_now_price, paid, seller_id, shop_product_id')
    .eq('id', auction_id)
    .single()

  if (loadErr || !auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!auction.buy_now_price) {
    return NextResponse.json({ error: 'This auction has no Buy Now price' }, { status: 400 })
  }

  if (auction.paid) {
    return NextResponse.json({ error: 'This auction has already been paid for' }, { status: 409 })
  }

  const now = Date.now()
  const startsAtMs = auction.starts_at ? new Date(auction.starts_at).getTime() : null

  // Buy Now is only available while the auction is scheduled (not started)
  const isScheduled = auction.status === 'scheduled' || (startsAtMs != null && startsAtMs > now)
  if (!isScheduled) {
    return NextResponse.json({ error: 'Buy Now is only available before the auction starts' }, { status: 409 })
  }

  // Can't buy your own auction
  if (auction.seller_id === user.id) {
    return NextResponse.json({ error: 'You cannot buy your own auction item' }, { status: 403 })
  }

  // ── Insert "buy now" bid ──────────────────────────────────────────────────
  const { data: bid, error: bidErr } = await supabase
    .from('bids')
    .insert({
      auction_id,
      user_id: user.id,
      amount: auction.buy_now_price,
    })
    .select('id')
    .single()

  if (bidErr || !bid) {
    console.error('[buy-now] bid insert failed:', bidErr)
    return NextResponse.json({ error: 'Failed to create purchase record' }, { status: 500 })
  }

  // ── Mark auction ended with this user as winner ───────────────────────────
  const paymentDueAt = new Date(now + ONE_HOUR_MS).toISOString()
  const { error: updateErr } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      winning_bid_id: bid.id,
      current_price: auction.buy_now_price,
      auction_payment_due_at: paymentDueAt,
    })
    .eq('id', auction_id)

  if (updateErr) {
    console.error('[buy-now] auction update failed:', updateErr)
    // Rollback bid
    await supabase.from('bids').delete().eq('id', bid.id)
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    payPath: `/pay/${auction_id}`,
    paymentDueAt,
  })
}
