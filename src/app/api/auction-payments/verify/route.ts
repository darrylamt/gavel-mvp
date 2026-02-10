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
    console.error('Paystack verification failed:', json)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 400 }
    )
  }

  const { metadata } = json.data

  if (metadata?.type !== 'auction_payment') {
    console.error('Invalid payment type:', metadata?.type)
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
    console.log('Auction already paid:', auction_id)
    return NextResponse.json({ success: true })
  }

  // 3️⃣ Mark auction as paid
  const { error: updateError } = await supabase
    .from('auctions')
    .update({
      paid: true,
      winner_id: user_id,
      winning_bid_id: bid_id,
    })
    .eq('id', auction_id)

  if (updateError) {
    console.error('Failed to update auction:', updateError)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }

  // 4️⃣ Log payment
  await supabase.from('payments').insert({
    user_id,
    auction_id,
    amount: json.data.amount / 100,
    reference,
    status: 'success',
    type: 'auction',
  })

  console.log('Payment successful for auction:', auction_id)
  return NextResponse.json({ success: true })
}
