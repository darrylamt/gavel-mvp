'use server'

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/serverSupabase'
import { queueAuctionCountdownNotification } from '@/lib/arkesel/events'

function authorized(request: Request) {
  const url = new URL(request.url)
  const secretFromQuery = url.searchParams.get('secret')
  const secretFromHeader = request.headers.get('x-dispatch-secret')
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  
  const expected = process.env.ARKESEL_DISPATCH_SECRET || process.env.CRON_SECRET || ''
  return !!expected && (bearer === expected || secretFromQuery === expected || secretFromHeader === expected)
}

type TimeInterval = '10h' | '5h' | '1h' | '30m' | '5m'

const TIME_WINDOWS: Array<{ key: TimeInterval; minutes: number; windowMinutes: number }> = [
  { key: '10h', minutes: 600, windowMinutes: 5 }, // 10 hours ± 5 minutes
  { key: '5h', minutes: 300, windowMinutes: 5 },   // 5 hours ± 5 minutes
  { key: '1h', minutes: 60, windowMinutes: 3 },    // 1 hour ± 3 minutes
  { key: '30m', minutes: 30, windowMinutes: 2 },   // 30 minutes ± 2 minutes
  { key: '5m', minutes: 5, windowMinutes: 1 },     // 5 minutes ± 1 minute
]

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (process.env.ARKESEL_ENABLED !== 'true') {
    return NextResponse.json({ message: 'SMS disabled' }, { status: 200 })
  }

  const service = createServiceRoleClient()
  const now = new Date()
  let totalSent = 0

  try {
    // Check each time interval
    for (const interval of TIME_WINDOWS) {
      const targetTime = new Date(now.getTime() + interval.minutes * 60 * 1000)
      const windowStart = new Date(targetTime.getTime() - interval.windowMinutes * 60 * 1000)
      const windowEnd = new Date(targetTime.getTime() + interval.windowMinutes * 60 * 1000)

      // Find active auctions ending within this time window
      const { data: auctions } = await service
        .from('auctions')
        .select('id, title, ends_at')
        .eq('status', 'active')
        .gte('ends_at', windowStart.toISOString())
        .lte('ends_at', windowEnd.toISOString())

      if (!auctions || auctions.length === 0) continue

      // For each auction, find all bidders
      for (const auction of auctions) {
        const { data: bids } = await service
          .from('bids')
          .select('user_id')
          .eq('auction_id', auction.id)

        if (!bids || bids.length === 0) continue

        // Get unique bidder IDs
        const bidderIds = Array.from(new Set(bids.map((b) => b.user_id)))

        // Queue countdown notifications
        await queueAuctionCountdownNotification({
          auctionId: auction.id,
          auctionTitle: auction.title,
          bidderUserIds: bidderIds,
          timeRemaining: interval.key,
        })

        totalSent += bidderIds.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `Queued ${totalSent} countdown notifications`,
      totalSent,
    })
  } catch (error) {
    console.error('Auction countdown cron error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
