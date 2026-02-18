import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

export async function POST(req: Request) {
  const { auction_id } = await req.json()

  if (!auction_id) {
    return NextResponse.json({ error: 'Missing auction_id' }, { status: 400 })
  }

  try {
    const resolution = await resolveAuctionPaymentCandidate(supabase, auction_id)

    if (resolution.reason === 'auction_not_ended') {
      return NextResponse.json({ error: 'Auction not ended yet' }, { status: 400 })
    }

    if (resolution.reason === 'already_paid') {
      return NextResponse.json({ success: true, paid: true })
    }

    return NextResponse.json({
      success: true,
      reserveMet: !!resolution.activeCandidate,
      winningBidId: resolution.activeCandidate?.bidId ?? null,
      paymentDueAt: resolution.paymentDueAt,
      winnerRank: resolution.activeCandidate?.rank ?? null,
    })
  } catch (error) {
    console.error('Failed to close auction:', error)
    return NextResponse.json({ error: 'Failed to close auction' }, { status: 500 })
  }
}
