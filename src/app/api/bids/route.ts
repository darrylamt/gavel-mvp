import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const { auction_id, amount, user_id } = await req.json()

  // 1. Fetch auction
  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .select('id, ends_at, status')
    .eq('id', auction_id)
    .single()

  if (auctionError || !auction) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  // 2. Enforce closing time
  const now = new Date()
  if (auction.status === 'ended' || new Date(auction.ends_at) <= now) {
    return NextResponse.json(
      { error: 'Auction has ended' },
      { status: 400 }
    )
  }

  // 3. Insert bid
  const { error: bidError } = await supabase.from('bids').insert({
    auction_id,
    amount,
    user_id,
  })

  if (bidError) {
    return NextResponse.json({ error: 'Bid failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
