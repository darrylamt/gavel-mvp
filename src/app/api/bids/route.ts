import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BID_TOKEN_COST = 1

export async function POST(req: Request) {
  const { auction_id, user_id, amount } = await req.json()

  if (!auction_id || !user_id || !amount) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  /* ---------------- AUCTION CHECK ---------------- */

  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .select('id, status, starts_at, ends_at, current_price, reserve_price, min_increment, max_increment')
    .eq('id', auction_id)
    .single()

  if (auctionError || !auction) {
    return NextResponse.json(
      { error: 'Auction not found' },
      { status: 404 }
    )
  }

  const now = Date.now()

  /* Check if auction has started */
  const hasStarted =
    !auction.starts_at ||
    new Date(auction.starts_at).getTime() <= now

  if (!hasStarted) {
    return NextResponse.json(
      { error: 'Auction has not started yet' },
      { status: 403 }
    )
  }

  /* Check if auction has ended */
  const endedByTime =
    auction.ends_at &&
    new Date(auction.ends_at).getTime() <= now

  if (endedByTime || auction.status === 'ended') {
    if (auction.status !== 'ended') {
      await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auction_id)
    }

    return NextResponse.json(
      { error: 'Auction has ended' },
      { status: 403 }
    )
  }

  if (auction.status === 'scheduled') {
    await supabase
      .from('auctions')
      .update({ status: 'active' })
      .eq('id', auction_id)
  }

  const bidAmount = Number(amount)
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return NextResponse.json(
      { error: 'Invalid bid amount' },
      { status: 400 }
    )
  }

  /* Check bid amount against current price */
  if (bidAmount <= auction.current_price) {
    return NextResponse.json(
      { error: 'Bid must be higher than current price' },
      { status: 400 }
    )
  }

  const bidIncrement = bidAmount - auction.current_price
  const minIncrement = Number(auction.min_increment ?? 1)
  const maxIncrement = auction.max_increment == null ? null : Number(auction.max_increment)

  if (Number.isFinite(minIncrement) && minIncrement > 0 && bidIncrement < minIncrement) {
    return NextResponse.json(
      { error: `Bid must be at least GHS ${minIncrement.toLocaleString()} above current price` },
      { status: 400 }
    )
  }

  if (maxIncrement != null && Number.isFinite(maxIncrement) && maxIncrement > 0 && bidIncrement > maxIncrement) {
    return NextResponse.json(
      { error: `Bid cannot be more than GHS ${maxIncrement.toLocaleString()} above current price` },
      { status: 400 }
    )
  }

  /* ---------------- TOKEN CHECK ---------------- */

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('token_balance')
    .eq('id', user_id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    )
  }

  if (profile.token_balance < BID_TOKEN_COST) {
    return NextResponse.json(
      { error: 'Insufficient tokens to place a bid' },
      { status: 402 }
    )
  }

  /* ---------------- INSERT BID ---------------- */

  const { error: bidError } = await supabase
    .from('bids')
    .insert({
      auction_id,
      user_id,
      amount: bidAmount,
    })

  if (bidError) {
    console.error('Bid insert error:', bidError)
    return NextResponse.json(
      { error: `Failed to place bid: ${bidError.message}` },
      { status: 500 }
    )
  }

  /* ---------------- UPDATE AUCTION ---------------- */

  const endsAtMs = auction.ends_at ? new Date(auction.ends_at).getTime() : null
  const remainingMs = endsAtMs != null ? endsAtMs - now : null
  const shouldExtendBy30s = remainingMs != null && remainingMs > 0 && remainingMs <= 30_000

  const nextAuctionUpdate: { current_price: number; ends_at?: string } = {
    current_price: bidAmount,
  }

  if (shouldExtendBy30s && endsAtMs != null) {
    nextAuctionUpdate.ends_at = new Date(endsAtMs + 30_000).toISOString()
  }

  await supabase
    .from('auctions')
    .update(nextAuctionUpdate)
    .eq('id', auction_id)

  /* ---------------- DEDUCT TOKEN ---------------- */

  await supabase
    .from('profiles')
    .update({
      token_balance: profile.token_balance - BID_TOKEN_COST,
    })
    .eq('id', user_id)

  /* ---------------- LOG TRANSACTION ---------------- */

  await supabase.from('token_transactions').insert({
    user_id,
    amount: -BID_TOKEN_COST,
    type: 'bid',
    reference: `bid:${auction_id}`,
  })

  return NextResponse.json({ success: true })
}
