import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const paystackKey = process.env.PAYSTACK_SECRET_KEY

if (!supabaseUrl || !serviceRoleKey || !paystackKey) {
  throw new Error('Missing environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

export async function POST(req: Request) {
  const { auction_id, user_id, email } = await req.json()

  if (!auction_id || !user_id || !email) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  /* ---------------- AUCTION CHECK ---------------- */

  const { data: auction } = await supabase
    .from('auctions')
    .select('id, status, paid')
    .eq('id', auction_id)
    .single()

  if (!auction || auction.status !== 'ended') {
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

  /* ---------------- GET HIGHEST BID (AUTHORITATIVE) ---------------- */

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

  /* ---------------- INIT PAYSTACK ---------------- */

  const res = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(topBid.amount) * 100),
        metadata: {
          auction_id,
          bid_id: topBid.id,
          type: 'auction_payment',
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`,
      }),
    }
  )

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json(
      { error: 'Paystack init failed' },
      { status: 500 }
    )
  }

  return NextResponse.json(json.data)
}
