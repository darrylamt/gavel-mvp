import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { reference } = await req.json()

  if (!reference) {
    return NextResponse.json(
      { error: 'Missing reference' },
      { status: 400 }
    )
  }

  // 1️⃣ Verify Paystack
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 400 }
    )
  }

  const { metadata } = json.data

  if (metadata?.type !== 'auction_payment') {
    return NextResponse.json(
      { error: 'Invalid payment type' },
      { status: 400 }
    )
  }

  const { auction_id, bid_id, user_id } = metadata

  // 2️⃣ Prevent double payment
  const { data: auction } = await supabase
    .from('auctions')
    .select('paid')
    .eq('id', auction_id)
    .single()

  if (auction?.paid) {
    return NextResponse.json({ success: true })
  }

  // 3️⃣ Mark auction as paid
  await supabase
    .from('auctions')
    .update({
      paid: true,
      winner_id: user_id,
      winning_bid_id: bid_id,
    })
    .eq('id', auction_id)

  // 4️⃣ Log payment
  await supabase.from('payments').insert({
    user_id,
    auction_id,
    amount: json.data.amount / 100,
    reference,
    status: 'success',
    type: 'auction',
  })

  return NextResponse.json({ success: true })
}
