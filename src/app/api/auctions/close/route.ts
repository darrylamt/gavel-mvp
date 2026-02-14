import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const BID_TOKEN_COST = 1


export async function POST(req: Request) {
  const { auction_id } = await req.json()

  if (!auction_id) {
    return NextResponse.json({ error: 'Missing auction_id' }, { status: 400 })
  }

  const { data: topBid, error: topBidError } = await supabase
    .from('bids')
    .select('id, amount, user_id')
    .eq('auction_id', auction_id)
    .order('amount', { ascending: false })
    .limit(1)
    .single()

  if (topBidError && topBidError.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to fetch top bid' }, { status: 500 })
  }

  const { error: closeError } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      winning_bid_id: topBid?.id ?? null,
    })
    .eq('id', auction_id)

  if (closeError) {
    return NextResponse.json({ error: 'Failed to close auction' }, { status: 500 })
  }

  const winnerUserId = topBid?.user_id ?? null

  const { data: allBids, error: bidsError } = await supabase
    .from('bids')
    .select('user_id')
    .eq('auction_id', auction_id)

  if (bidsError) {
    return NextResponse.json({ error: 'Auction closed, but failed to process refunds' }, { status: 500 })
  }

  const loserBidCounts = new Map<string, number>()

  for (const bid of allBids ?? []) {
    if (!bid.user_id) continue
    if (winnerUserId && bid.user_id === winnerUserId) continue
    loserBidCounts.set(bid.user_id, (loserBidCounts.get(bid.user_id) ?? 0) + 1)
  }

  for (const [userId, bidCount] of loserBidCounts.entries()) {
    const refundAmount = bidCount * BID_TOKEN_COST
    const refundReference = `refund:${auction_id}:${userId}`

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
      return NextResponse.json({ error: 'Auction closed, but failed to credit loser refunds' }, { status: 500 })
    }

    const { error: refundLogError } = await supabase.from('token_transactions').insert({
      user_id: userId,
      amount: refundAmount,
      type: 'bid',
      reference: refundReference,
    })

    if (refundLogError) {
      return NextResponse.json({ error: 'Auction closed, but failed to log loser refunds' }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    winningBidId: topBid?.id ?? null,
  })
}
