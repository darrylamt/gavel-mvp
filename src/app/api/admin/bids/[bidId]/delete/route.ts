import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request, context: { params: Promise<{ bidId: string }> }) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string | null }>()

  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { bidId } = await context.params

  const { data: bid, error: bidError } = await service
    .from('bids')
    .select('id, auction_id, user_id, amount')
    .eq('id', bidId)
    .maybeSingle()

  if (bidError || !bid) {
    return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  }

  const { error: deleteError } = await service
    .from('bids')
    .delete()
    .eq('id', bidId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Get auction details and find new highest bid
  const { data: auction, error: auctionError } = await service
    .from('auctions')
    .select('id, starting_price')
    .eq('id', bid.auction_id)
    .maybeSingle()

  if (!auctionError && auction) {
    // Find the new highest bid for this auction
    const { data: highestBids } = await service
      .from('bids')
      .select('amount')
      .eq('auction_id', bid.auction_id)
      .order('amount', { ascending: false })
      .limit(1)

    const highestBid = highestBids?.[0]

    // Update auction with new current price
    const newCurrentPrice = highestBid?.amount || auction.starting_price
    await service
      .from('auctions')
      .update({ current_price: newCurrentPrice })
      .eq('id', bid.auction_id)
  }

  return NextResponse.json({ success: true, bid })
}
