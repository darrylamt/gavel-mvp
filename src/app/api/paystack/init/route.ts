import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const { auction_id, user_id, email } = await req.json()

  // 1. Get auction
  const { data: auction } = await supabase
    .from('auctions')
    .select('id, status, winning_bid_id, paid')
    .eq('id', auction_id)
    .single()

  if (!auction || auction.status !== 'ended') {
    return NextResponse.json({ error: 'Auction not ended' }, { status: 400 })
  }

  if (auction.paid) {
    return NextResponse.json({ error: 'Already paid' }, { status: 400 })
  }

  // 2. Get winning bid
  const { data: bid } = await supabase
    .from('bids')
    .select('id, amount, user_id')
    .eq('id', auction.winning_bid_id)
    .single()

  if (!bid || bid.user_id !== user_id) {
    return NextResponse.json({ error: 'Not auction winner' }, { status: 403 })
  }

  // 3. Init Paystack
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: bid.amount * 100,
      metadata: {
        auction_id,
        bid_id: bid.id,
      },
    }),
  })

  const data = await res.json()
  return NextResponse.json(data)
}
