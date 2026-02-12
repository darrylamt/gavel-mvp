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
    .select('id, status, starts_at, ends_at, current_price, reserve_price')
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

  if (auction.status === 'ended' || endedByTime) {
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

  /* Check bid amount against current price */
  if (Number(amount) <= auction.current_price) {
    return NextResponse.json(
      { error: 'Bid must be higher than current price' },
      { status: 400 }
    )
  }

  /* Check bid amount against reserve price if set */
  if (auction.reserve_price != null && Number(amount) < auction.reserve_price) {
    return NextResponse.json(
      { error: `Bid must meet the reserve price of GHS ${auction.reserve_price}` },
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
      amount,
    })

  if (bidError) {
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    )
  }

  /* ---------------- UPDATE AUCTION ---------------- */

  await supabase
    .from('auctions')
    .update({ current_price: amount })
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
