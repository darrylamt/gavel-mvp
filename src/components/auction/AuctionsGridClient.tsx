'use client'

import AuctionCard from '@/components/auction/AuctionCard'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { useEffect, useMemo, useState } from 'react'

type Auction = {
  id: string
  title: string
  description?: string | null
  starting_price?: number | null
  current_price: number
  ends_at: string
  starts_at?: string | null
  status?: string | null
  image_url?: string | null
  images?: string[] | null
  reserve_price?: number | null
  min_increment?: number | null
  max_increment?: number | null
}

type AuctionsGridClientProps = {
  auctions: Auction[]
  starredOnly?: boolean
  engagementCounts?: Record<string, { bidderCount: number; watcherCount: number }>
}

export default function AuctionsGridClient({ auctions, starredOnly = false, engagementCounts = {} }: AuctionsGridClientProps) {
  const { starredSet, pruneStarred } = useStarredAuctions()
  const [liveEngagementCounts, setLiveEngagementCounts] = useState(engagementCounts)

  useEffect(() => {
    setLiveEngagementCounts(engagementCounts)
  }, [engagementCounts])

  useEffect(() => {
    if (!starredOnly) return
    const validAuctionIds = auctions.map((auction) => auction.id)
    pruneStarred(validAuctionIds)
  }, [auctions, starredOnly, pruneStarred])

  const visibleAuctions = starredOnly
    ? auctions.filter((auction) => starredSet.has(auction.id))
    : auctions

  const visibleAuctionIds = useMemo(() => visibleAuctions.map((auction) => auction.id), [visibleAuctions])

  useEffect(() => {
    if (visibleAuctionIds.length === 0) return

    let cancelled = false

    const refreshEngagement = async () => {
      const ids = visibleAuctionIds.join(',')
      const res = await fetch(`/api/auctions/engagement?auctionIds=${encodeURIComponent(ids)}`, {
        cache: 'no-store',
      })

      if (!res.ok || cancelled) return

      const payload = (await res.json()) as {
        counts?: Record<string, { bidderCount: number; watcherCount: number }>
      }

      if (cancelled || !payload?.counts) return

      setLiveEngagementCounts((previous) => ({
        ...previous,
        ...payload.counts,
      }))
    }

    void refreshEngagement()
    const interval = setInterval(refreshEngagement, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [visibleAuctionIds])

  if (!visibleAuctions.length) {
    return (
      <div className="border rounded-2xl p-12 text-center text-gray-500">
        {starredOnly ? 'No starred auctions yet.' : 'No auctions available yet.'}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {visibleAuctions.map((auction) => (
        (() => {
          const counts = liveEngagementCounts[auction.id] ?? { bidderCount: 0, watcherCount: 0 }
          return (
        <AuctionCard
          key={auction.id}
          id={auction.id}
          title={auction.title}
          description={auction.description}
          startingPrice={auction.starting_price}
          currentPrice={auction.current_price}
          endsAt={auction.ends_at}
          startsAt={auction.starts_at}
          status={auction.status}
          imageUrl={auction.image_url}
          images={auction.images}
          reservePrice={auction.reserve_price}
          minIncrement={auction.min_increment}
          maxIncrement={auction.max_increment}
          bidderCount={counts.bidderCount}
          watcherCount={counts.watcherCount}
        />
          )
        })()
      ))}
    </div>
  )
}
