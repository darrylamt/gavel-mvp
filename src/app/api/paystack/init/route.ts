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

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY not configured')
    return NextResponse.json(
      { error: 'Payment service not configured' },
      { status: 500 }
    )
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error('NEXT_PUBLIC_SITE_URL not configured')
    return NextResponse.json(
      { error: 'Site URL not configured' },
      { status: 500 }
    )
  }

  // 1️⃣ Fetch auction
  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .select('id, status, current_price, paid, ends_at, reserve_price')
    .eq('id', auction_id)
    .single()

  if (auctionError || !auction) {
    return NextResponse.json(
      { error: 'Auction not found' },
      { status: 404 }
    )
  }

  const endedByTime = auction.ends_at
    ? new Date(auction.ends_at).getTime() <= Date.now()
    : false

  const auctionEnded = auction.status === 'ended' || endedByTime

  if (!auctionEnded) {
    return NextResponse.json(
      { error: 'Auction not ended' },
      { status: 400 }
    )
  }

  if (auction.paid) {
    return NextResponse.json(
      { error: 'Auction already paid' },
      { status: 400 }
    )
  }

  // 2️⃣ Get highest bid (authoritative)
  const { data: topBid } = await supabase
    .from('bids')
    .select('id, amount, user_id')
    .eq('auction_id', auction_id)
    .order('amount', { ascending: false })
    .limit(1)
    .single()

  if (!topBid) {
    return NextResponse.json(
      { error: 'No bids found' },
      { status: 400 }
    )
  }

  if (topBid.user_id !== user_id) {
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
        amount: Math.round(topBid.amount * 100),
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
    console.error('Paystack init failed:', json)
    return NextResponse.json(
      { error: json.message || 'Paystack init failed' },
      { status: 500 }
    )
  }

  if (!json.data?.authorization_url) {
    console.error('No authorization_url in Paystack response:', json.data)
    return NextResponse.json(
      { error: 'Invalid Paystack response' },
      { status: 500 }
    )
  }

  return NextResponse.json(json.data)
}
