import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import 'server-only'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
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
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const metadata = event.data?.metadata
    const auction_id = metadata?.auction_id

    if (metadata?.type === 'auction_payment' && auction_id) {
      let winnerUserId: string | null = metadata?.user_id ?? null
      let winningBidId: string | null = metadata?.bid_id ?? null

      if (!winnerUserId || !winningBidId) {
        const { data: topBid } = await supabase
          .from('bids')
          .select('id, user_id')
          .eq('auction_id', auction_id)
          .order('amount', { ascending: false })
          .limit(1)
          .single()

        winnerUserId = topBid?.user_id ?? null
        winningBidId = topBid?.id ?? null
      }

      await supabase
        .from('auctions')
        .update({
          status: 'ended',
          paid: true,
          winner_id: winnerUserId,
          winning_bid_id: winningBidId,
        })
        .eq('id', auction_id)

      if (winnerUserId) {
        await refundLosingBidders(auction_id, winnerUserId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
