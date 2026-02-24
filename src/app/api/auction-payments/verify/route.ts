import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'
import { queueAuctionPaymentReceivedNotifications } from '@/lib/whatsapp/events'

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

  if (json.data?.status !== 'success') {
    return NextResponse.json(
      { error: 'Payment was not successful' },
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

  if (!auction_id || !bid_id || !user_id) {
    return NextResponse.json(
      { error: 'Invalid auction payment metadata' },
      { status: 400 }
    )
  }

  const resolution = await resolveAuctionPaymentCandidate(supabase, String(auction_id))

  if (resolution.reason === 'auction_not_ended') {
    return NextResponse.json({ error: 'Auction not ended' }, { status: 400 })
  }

  if (resolution.reason === 'already_paid') {
    return NextResponse.json({ success: true })
  }

  if (!resolution.activeCandidate) {
    return NextResponse.json(
      { error: 'No eligible winner at or above reserve price. Auction closed without sale.' },
      { status: 400 }
    )
  }

  if (
    resolution.activeCandidate.bidId !== String(bid_id) ||
    resolution.activeCandidate.userId !== String(user_id)
  ) {
    return NextResponse.json(
      { error: 'Payment window expired or bidder is no longer current winner' },
      { status: 403 }
    )
  }

  // 3️⃣ Mark auction as paid
  const { error: updateError } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      paid: true,
      winner_id: resolution.activeCandidate.userId,
      winning_bid_id: resolution.activeCandidate.bidId,
      auction_payment_due_at: null,
    })
    .eq('id', String(auction_id))

  if (updateError) {
    console.error('Failed to update auction:', updateError)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }

  // 4️⃣ Log payment
  const paymentPayloadBase = {
    user_id: resolution.activeCandidate.userId,
    auction_id: String(auction_id),
    amount: json.data.amount / 100,
    status: 'success',
  }

  let { error: paymentLogError } = await supabase.from('payments').insert({
    ...paymentPayloadBase,
    paystack_reference: reference,
  })

  const paymentLogErrorMessage = String(paymentLogError?.message || '').toLowerCase()
  if (paymentLogErrorMessage.includes('paystack_reference') && paymentLogErrorMessage.includes('does not exist')) {
    const fallback = await supabase.from('payments').insert({
      ...paymentPayloadBase,
      reference,
    })
    paymentLogError = fallback.error
  }

  if (paymentLogError) {
    console.error('Failed to log auction payment:', paymentLogError)
  }

  const { data: auctionMeta } = await supabase
    .from('auctions')
    .select('id, title, created_by')
    .eq('id', String(auction_id))
    .maybeSingle<{ id: string; title: string | null; created_by: string | null }>()

  if (auctionMeta) {
    await queueAuctionPaymentReceivedNotifications({
      auctionId: auctionMeta.id,
      auctionTitle: auctionMeta.title || 'Auction',
      winnerUserId: resolution.activeCandidate.userId,
      sellerUserId: auctionMeta.created_by,
      amount: Number(json.data.amount) / 100,
    })
  }

  console.log('Payment successful for auction:', auction_id)
  return NextResponse.json({ success: true })
}
