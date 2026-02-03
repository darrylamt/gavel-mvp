import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { auction_id, user_id, amount } = await req.json()

  if (!auction_id || !user_id || !amount) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // 1️⃣ FETCH AUCTION (AUTHORITATIVE CHECK)
  const { data: auction, error } = await supabase
    .from('auctions')
    .select('id, status, ends_at, current_price')
    .eq('id', auction_id)
    .single()

  if (error || !auction) {
    return NextResponse.json(
      { error: 'Auction not found' },
      { status: 404 }
    )
  }

  const now = Date.now()
  const endedByTime =
    auction.ends_at &&
    new Date(auction.ends_at).getTime() <= now

  // 2️⃣ HARD STOP: AUCTION ENDED
  if (auction.status === 'ended' || endedByTime) {
    // Optional: auto-close if status is stale
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

  // 3️⃣ BID MUST BE HIGHER
  if (Number(amount) <= auction.current_price) {
    return NextResponse.json(
      { error: 'Bid must be higher than current price' },
      { status: 400 }
    )
  }

  // 4️⃣ INSERT BID
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

  // 5️⃣ UPDATE CURRENT PRICE
  await supabase
    .from('auctions')
    .update({ current_price: amount })
    .eq('id', auction_id)

  return NextResponse.json({ success: true })
}
