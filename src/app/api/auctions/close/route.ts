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
  const { auction_id } = await req.json()

  // 1. Get highest bid
  const { data: topBid } = await supabase
    .from('bids')
    .select('id, amount')
    .eq('auction_id', auction_id)
    .order('amount', { ascending: false })
    .limit(1)
    .single()

  // 2. End auction
  const { error } = await supabase
    .from('auctions')
    .update({
      status: 'ended',
      winning_bid_id: topBid?.id ?? null,
    })
    .eq('id', auction_id)

  if (error) {
    return NextResponse.json({ error: 'Failed to close auction' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    winningBidId: topBid?.id ?? null,
  })
}
