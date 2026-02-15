import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { auction_id, user_id, email } = await req.json()

  if (!auction_id || !user_id || !email) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // 1️⃣ Fetch auction
  const { data: auction } = await supabase
    .from('auctions')
    .select('id, status, current_price, paid, reserve_price')
    .eq('id', auction_id)
    .single()

  if (!auction) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  if (auction.status !== 'ended') {
    return NextResponse.json({ error: 'Auction not ended' }, { status: 400 })
  }

  if (auction.paid) {
    return NextResponse.json({ error: 'Auction already paid' }, { status: 400 })
  }

  // 2️⃣ Confirm winner (highest bid)
  const { data: topBid } = await supabase
    .from('bids')
    .select('id, amount, user_id')
    .eq('auction_id', auction_id)
    .order('amount', { ascending: false })
    .limit(1)
    .single()

  if (!topBid || topBid.user_id !== user_id) {
    return NextResponse.json(
      { error: 'Not auction winner' },
      { status: 403 }
    )
  }

  const reservePrice = auction.reserve_price as number | null
  if (reservePrice != null && topBid.amount < reservePrice) {
    return NextResponse.json(
      { error: 'Reserve price not met. This item cannot be sold yet.' },
      { status: 400 }
    )
  }

  // 3️⃣ Init Paystack
  const res = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(topBid.amount) * 100),
        metadata: {
          type: 'auction_payment',
          auction_id,
          bid_id: topBid.id,
          user_id,
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`,
      }),
    }
  )

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json({ error: 'Paystack init failed' }, { status: 500 })
  }

  return NextResponse.json(json.data)
}
