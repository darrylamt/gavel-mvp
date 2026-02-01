import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const { auction_id, amount, user_id } = await req.json()

  // 1. Fetch auction
  const { data: auction, error } = await supabase
    .from('auctions')
    .select('id, ends_at, status, current_price, min_increment')
    .eq('id', auction_id)
    .single()

  if (error || !auction) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  // 2. Enforce active auction
  if (
    auction.status !== 'active' ||
    new Date(auction.ends_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: 'Auction has ended' },
      { status: 400 }
    )
  }

  // 3. Enforce minimum increment
  const minAllowed = Number(auction.current_price) + Number(auction.min_increment)
  if (Number(amount) < minAllowed) {
    return NextResponse.json(
      { error: `Bid must be at least GHS ${minAllowed}` },
      { status: 400 }
    )
  }

  // 4. Insert bid
  const { error: bidError } = await supabase.from('bids').insert({
    auction_id,
    amount,
    user_id,
  })

  if (bidError) {
    return NextResponse.json({ error: 'Bid failed' }, { status: 500 })
  }

  // 5. Update current price
  await supabase
    .from('auctions')
    .update({ current_price: amount })
    .eq('id', auction_id)

  return NextResponse.json({ success: true })
}
