import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

export async function POST(req: Request) {
  const { auction_id, user_id, email } = await req.json()

  // 1) Fetch auction
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

  // 2) Fetch winning bid
  const { data: bid } = await supabase
    .from('bids')
    .select('id, amount, user_id')
    .eq('id', auction.winning_bid_id)
    .single()

  if (!bid || bid.user_id !== user_id) {
    return NextResponse.json({ error: 'Not auction winner' }, { status: 403 })
  }

  // 3) Init Paystack
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: Math.round(Number(bid.amount) * 100),
      metadata: {
        auction_id,
        bid_id: bid.id,
      },
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`,
    }),
  })

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json({ error: 'Paystack init failed' }, { status: 500 })
  }

  return NextResponse.json(json.data)
}
