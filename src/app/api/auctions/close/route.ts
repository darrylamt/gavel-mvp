import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


export async function POST(req: Request) {
  const { auction_id } = await req.json()

  // 1. Get highest bid
  const { data: topBid } = await supabase
    .from('bids')
    .select('id, amount')
    .eq('auction_id', auction_id)
    .order('amount', { ascending: false })
    .limit(1)
    .single()

  // 2. End auction
  const { error } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      winning_bid_id: topBid?.id ?? null,
    })
    .eq('id', auction_id)

  if (error) {
    return NextResponse.json({ error: 'Failed to close auction' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    winningBidId: topBid?.id ?? null,
  })
}
