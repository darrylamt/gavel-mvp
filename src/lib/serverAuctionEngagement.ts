import { createClient } from '@supabase/supabase-js'

type EngagementCount = {
  bidderCount: number
  watcherCount: number
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getAuctionEngagementCounts(auctionIds: string[]) {
  const uniqueIds = Array.from(new Set(auctionIds.filter(Boolean)))
  const counts = new Map<string, EngagementCount>()

  for (const id of uniqueIds) {
    counts.set(id, { bidderCount: 0, watcherCount: 0 })
  }

  if (uniqueIds.length === 0) return counts

  const { data: bidsData } = await admin
    .from('bids')
    .select('auction_id, user_id')
    .in('auction_id', uniqueIds)

  const bidderSets = new Map<string, Set<string>>()
  for (const row of bidsData ?? []) {
    const auctionId = row.auction_id as string | null
    const userId = row.user_id as string | null
    if (!auctionId || !userId) continue

    const set = bidderSets.get(auctionId) ?? new Set<string>()
    set.add(userId)
    bidderSets.set(auctionId, set)
  }

  for (const [auctionId, set] of bidderSets.entries()) {
    const current = counts.get(auctionId)
    if (!current) continue
    current.bidderCount = set.size
    counts.set(auctionId, current)
  }

  const { data: watchersData, error: watchersError } = await admin
    .from('auction_watchers')
    .select('auction_id, viewer_key, user_id')
    .in('auction_id', uniqueIds)
    .or('starred.eq.true,viewed.eq.true')

  if (!watchersError) {
    const watcherSets = new Map<string, Set<string>>()

    for (const row of watchersData ?? []) {
      const auctionId = row.auction_id as string | null
      const viewerKey = row.viewer_key as string | null
      const userId = row.user_id as string | null
      if (!auctionId) continue

      const uniqueWatcherKey = userId
        ? `user:${userId}`
        : viewerKey
          ? `viewer:${viewerKey}`
          : null

      if (!uniqueWatcherKey) continue

      const set = watcherSets.get(auctionId) ?? new Set<string>()
      set.add(uniqueWatcherKey)
      watcherSets.set(auctionId, set)
    }

    for (const [auctionId, set] of watcherSets.entries()) {
      const current = counts.get(auctionId)
      if (!current) continue
      current.watcherCount = set.size
      counts.set(auctionId, current)
    }
  }

  return counts
}
