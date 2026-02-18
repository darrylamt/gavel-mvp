import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BID_TOKEN_COST = 1

async function refundLosingBidders(auctionId: string, winnerUserId: string) {
  const { data: allBids, error: bidsError } = await supabase
    .from('bids')
    .select('user_id')
    .eq('auction_id', auctionId)

  if (bidsError) {
    throw new Error('Failed to load bids for refund')
  }

  const loserBidCounts = new Map<string, number>()

  for (const bid of allBids ?? []) {
    if (!bid.user_id) continue
    if (bid.user_id === winnerUserId) continue
    loserBidCounts.set(bid.user_id, (loserBidCounts.get(bid.user_id) ?? 0) + 1)
  }

  for (const [userId, bidCount] of loserBidCounts.entries()) {
    const refundAmount = bidCount * BID_TOKEN_COST
    const refundReference = `refund:${auctionId}:${userId}`

    const { data: existingRefund } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('reference', refundReference)
      .maybeSingle()

    if (existingRefund) continue

    const { error: incrementError } = await supabase.rpc('increment_tokens', {
      uid: userId,
      amount: refundAmount,
    })

    if (incrementError) {
      throw new Error('Failed to credit loser refund')
    }

    const { error: refundLogError } = await supabase.from('token_transactions').insert({
      user_id: userId,
      amount: refundAmount,
      type: 'bid',
      reference: refundReference,
    })

    if (refundLogError) {
      throw new Error('Failed to log loser refund')
    }
  }
}

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

  const { auction_id } = metadata

  // 2️⃣ Prevent double payment
  const { data: auction } = await supabase
    .from('auctions')
    .select('paid, reserve_price')
    .eq('id', auction_id)
    .single()

  const { data: topBid } = await supabase
    .from('bids')
    .select('id, amount, user_id')
    .eq('auction_id', auction_id)
    .order('amount', { ascending: false })
    .limit(1)
    .single()

  if (!topBid) {
    return NextResponse.json({ error: 'No bids found for this auction' }, { status: 400 })
  }

  const reservePrice = auction?.reserve_price as number | null
  if (reservePrice != null && topBid.amount < reservePrice) {
    return NextResponse.json(
      { error: 'Reserve price not met. This item cannot be sold.' },
      { status: 400 }
    )
  }

  if (auction?.paid) {
    await refundLosingBidders(auction_id, topBid.user_id)
    console.log('Auction already paid:', auction_id)
    return NextResponse.json({ success: true })
  }

  // 3️⃣ Mark auction as paid
  const { error: updateError } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      paid: true,
      winner_id: topBid.user_id,
      winning_bid_id: topBid.id,
    })
    .eq('id', auction_id)

  if (updateError) {
    console.error('Failed to update auction:', updateError)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }

  await refundLosingBidders(auction_id, topBid.user_id)

  // 4️⃣ Log payment
  const { error: paymentLogError } = await supabase.from('payments').insert({
    user_id: topBid.user_id,
    auction_id,
    amount: json.data.amount / 100,
    paystack_reference: reference,
    status: 'success',
  })

  if (paymentLogError) {
    console.error('Failed to log auction payment:', paymentLogError)
  }

  console.log('Payment successful for auction:', auction_id)
  return NextResponse.json({ success: true })
}
