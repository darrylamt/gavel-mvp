import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { maskBidderEmail } from '@/lib/maskBidderEmail'
import 'server-only'

type AuctionRow = {
  id: string
  title: string | null
  current_price: number | null
  image_url: string | null
  images: string[] | null
  winning_bid_id: string | null
  ends_at: string | null
}

type BidRow = {
  id: string
  user_id: string | null
  amount: number | null
}

type ProfileRow = {
  id: string
  username: string | null
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  const service = createClient(supabaseUrl, serviceRoleKey)

  const { data: auctions, error: auctionsError } = await service
    .from('auctions')
    .select('id, title, current_price, image_url, images, winning_bid_id, ends_at')
    .eq('status', 'ended')
    .not('winning_bid_id', 'is', null)
    .order('ends_at', { ascending: false })
    .limit(30)

  if (auctionsError) {
    return NextResponse.json({ error: auctionsError.message }, { status: 500 })
  }

  const auctionRows = (auctions ?? []) as AuctionRow[]
  const winningBidIds = Array.from(
    new Set(auctionRows.map((auction) => auction.winning_bid_id).filter(Boolean) as string[])
  )

  let bidsById = new Map<string, BidRow>()
  if (winningBidIds.length > 0) {
    const { data: bids, error: bidsError } = await service
      .from('bids')
      .select('id, user_id, amount')
      .in('id', winningBidIds)

    if (bidsError) {
      return NextResponse.json({ error: bidsError.message }, { status: 500 })
    }

    bidsById = new Map(((bids ?? []) as BidRow[]).map((bid) => [bid.id, bid]))
  }

  const winnerUserIds = Array.from(
    new Set(Array.from(bidsById.values()).map((bid) => bid.user_id).filter(Boolean) as string[])
  )

  let profilesById = new Map<string, ProfileRow>()
  if (winnerUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await service
      .from('profiles')
      .select('id, username')
      .in('id', winnerUserIds)

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    profilesById = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  }

  const winnerEmailsById = new Map<string, string>()
  if (winnerUserIds.length > 0) {
    const userResults = await Promise.allSettled(
      winnerUserIds.map(async (userId) => {
        const { data } = await service.auth.admin.getUserById(userId)
        return { userId, email: data.user?.email || null }
      })
    )

    for (const result of userResults) {
      if (result.status !== 'fulfilled') continue
      if (!result.value.email) continue
      winnerEmailsById.set(result.value.userId, result.value.email)
    }
  }

  const winners = auctionRows.map((auction) => {
    const winningBid = auction.winning_bid_id ? bidsById.get(auction.winning_bid_id) : null
    const winnerProfile = winningBid?.user_id ? profilesById.get(winningBid.user_id) : null
    const winnerEmail = winningBid?.user_id ? winnerEmailsById.get(winningBid.user_id) : null
    const maskedEmail = maskBidderEmail(winnerEmail)

    return {
      auctionId: auction.id,
      auctionTitle: auction.title || 'Auction',
      winningAmount: winningBid?.amount ?? auction.current_price ?? 0,
      imageUrl: auction.image_url || auction.images?.[0] || null,
      winnerName: maskedEmail || winnerProfile?.username || 'Gavel User',
      endedAt: auction.ends_at,
    }
  })

  return NextResponse.json({ winners })
}
