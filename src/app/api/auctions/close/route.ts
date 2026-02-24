import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { resolveAuctionPaymentCandidate } from '@/lib/auctionPaymentCandidate'
import { queueAuctionClosedNotifications } from '@/lib/whatsapp/events'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function normalizeAuctionId(raw: unknown) {
  if (typeof raw !== 'string') return ''
  const decoded = decodeURIComponent(raw).trim()
  if (!decoded) return ''
  return decoded.split(',')[0].split('/')[0].trim()
}

export async function POST(req: Request) {
  const payload = await req.json()
  const auction_id = normalizeAuctionId(payload.auction_id)

  if (!auction_id) {
    return NextResponse.json({ error: 'Missing auction_id' }, { status: 400 })
  }

  try {
    const resolution = await resolveAuctionPaymentCandidate(supabase, auction_id)

    const { data: auctionMeta } = await supabase
      .from('auctions')
      .select('id, title, created_by')
      .eq('id', auction_id)
      .maybeSingle<{ id: string; title: string | null; created_by: string | null }>()

    if (auctionMeta) {
      await queueAuctionClosedNotifications({
        auctionId: auctionMeta.id,
        auctionTitle: auctionMeta.title || 'Auction',
        sellerUserId: auctionMeta.created_by,
        winnerUserId: resolution.activeCandidate?.userId ?? null,
        winnerAmount: resolution.activeCandidate?.amount ?? null,
        reserveMet: !!resolution.activeCandidate,
      })
    }

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
    const message = error instanceof Error ? error.message : 'Failed to close auction'
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Failed to close auction' },
      { status: 500 }
    )
  }
}
