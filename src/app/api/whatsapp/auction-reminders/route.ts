import { NextResponse } from 'next/server'
import 'server-only'
import { createServiceRoleClient } from '@/lib/serverSupabase'
import { queueWhatsAppNotification } from '@/lib/whatsapp/queue'

function authorized(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = process.env.WHATSAPP_DISPATCH_SECRET || process.env.CRON_SECRET || ''
  return !!expected && bearer === expected
}

type AuctionRow = {
  id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  status: string | null
  created_by: string | null
}

type WatchRow = {
  auction_id: string
  user_id: string | null
}

const WINDOWS = [
  { name: 'starts_24h', ms: 24 * 60 * 60 * 1000, templateKey: 'auction_starts_24h' as const },
  { name: 'starts_1h', ms: 60 * 60 * 1000, templateKey: 'auction_starts_1h' as const },
  { name: 'starts_10m', ms: 10 * 60 * 1000, templateKey: 'auction_starts_10m' as const },
  { name: 'ends_10m', ms: 10 * 60 * 1000, templateKey: 'watchlist_ends_10m' as const },
  { name: 'ends_5m', ms: 5 * 60 * 1000, templateKey: 'auction_ending_5m' as const },
  { name: 'ends_1m', ms: 60 * 1000, templateKey: 'auction_ending_1m' as const },
]

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const now = Date.now()
  const toleranceMs = 60 * 1000

  const { data: auctions, error } = await service
    .from('auctions')
    .select('id, title, starts_at, ends_at, status, created_by')
    .in('status', ['scheduled', 'active'])
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const auctionRows = (auctions ?? []) as AuctionRow[]
  const auctionIds = auctionRows.map((auction) => auction.id)

  const { data: watchers } = auctionIds.length
    ? await service
        .from('auction_watchers')
        .select('auction_id, user_id')
        .in('auction_id', auctionIds)
    : { data: [] }

  const watchRows = (watchers ?? []) as WatchRow[]
  const watcherByAuction = new Map<string, Set<string>>()
  for (const row of watchRows) {
    if (!row.auction_id || !row.user_id) continue
    const set = watcherByAuction.get(row.auction_id) ?? new Set<string>()
    set.add(row.user_id)
    watcherByAuction.set(row.auction_id, set)
  }

  let queued = 0

  for (const auction of auctionRows) {
    const startsAt = auction.starts_at ? new Date(auction.starts_at).getTime() : null
    const endsAt = auction.ends_at ? new Date(auction.ends_at).getTime() : null

    for (const window of WINDOWS) {
      if (window.name.startsWith('starts') && startsAt) {
        const delta = startsAt - now
        if (Math.abs(delta - window.ms) <= toleranceMs) {
          if (auction.created_by && window.templateKey !== 'watchlist_ends_10m') {
            const sellerResult = await queueWhatsAppNotification({
              userId: auction.created_by,
              templateKey: window.templateKey,
              params: { auction_title: auction.title },
              dedupeKey: `seller-reminder:${window.name}:${auction.id}:${auction.created_by}`,
            })
            if (sellerResult.queued) queued += 1
          }

          const watcherIds = Array.from(watcherByAuction.get(auction.id) ?? [])
          for (const watcherId of watcherIds) {
            const watcherTemplate = window.name === 'starts_1h' ? 'watchlist_starts_1h' : window.templateKey
            const watcherResult = await queueWhatsAppNotification({
              userId: watcherId,
              templateKey: watcherTemplate,
              params: { auction_title: auction.title },
              dedupeKey: `watcher-reminder:${window.name}:${auction.id}:${watcherId}`,
            })
            if (watcherResult.queued) queued += 1
          }
        }
      }

      if (window.name.startsWith('ends') && endsAt) {
        const delta = endsAt - now
        if (Math.abs(delta - window.ms) <= toleranceMs) {
          const bidderTemplate = window.templateKey

          const { data: bidRows } = await service
            .from('bids')
            .select('user_id')
            .eq('auction_id', auction.id)

          const bidderIds = Array.from(new Set((bidRows ?? []).map((row) => String(row.user_id || '')).filter(Boolean)))
          const watcherIds = Array.from(watcherByAuction.get(auction.id) ?? [])
          const recipientIds = Array.from(new Set([...bidderIds, ...watcherIds]))

          for (const recipientId of recipientIds) {
            const result = await queueWhatsAppNotification({
              userId: recipientId,
              templateKey: bidderTemplate,
              params: { auction_title: auction.title },
              dedupeKey: `ending-reminder:${window.name}:${auction.id}:${recipientId}`,
            })
            if (result.queued) queued += 1
          }
        }
      }
    }

    if (auction.status === 'scheduled' && startsAt && now >= startsAt && now < startsAt + toleranceMs) {
      const watcherIds = Array.from(watcherByAuction.get(auction.id) ?? [])
      if (auction.created_by) {
        const sellerLive = await queueWhatsAppNotification({
          userId: auction.created_by,
          templateKey: 'auction_live',
          params: { auction_title: auction.title },
          dedupeKey: `seller-live:${auction.id}:${auction.created_by}`,
        })
        if (sellerLive.queued) queued += 1
      }

      for (const watcherId of watcherIds) {
        const watcherLive = await queueWhatsAppNotification({
          userId: watcherId,
          templateKey: 'auction_live',
          params: { auction_title: auction.title },
          dedupeKey: `watcher-live:${auction.id}:${watcherId}`,
        })
        if (watcherLive.queued) queued += 1
      }
    }
  }

  return NextResponse.json({ success: true, auctions: auctionRows.length, queued })
}
