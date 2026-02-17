'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { supabasePublic } from '@/lib/supabasePublicClient'

import AuctionHeader from '@/components/auction/AuctionHeader'
import AuctionCountdown from '@/components/auction/AuctionCountdown'
import BidForm from '@/components/auction/BidForm'
import BidList from '@/components/auction/BidList'
import WinnerPanel from '@/components/auction/WinnerPanel'
import ImageGallery from '@/components/auction/ImageGallery'
import ShareAuctionButton from '@/components/auction/ShareAuctionButton'
import { parseAuctionMeta } from '@/lib/auctionMeta'
import { buildAuctionPath } from '@/lib/seo'
import { getOrCreateViewerKey } from '@/lib/engagement'

type AuctionRecord = {
  id: string
  title: string
  description: string | null
  current_price: number
  min_increment: number | null
  max_increment: number | null
  reserve_price: number | null
  sale_source: 'gavel' | 'seller' | null
  seller_name: string | null
  seller_phone: string | null
  starts_at: string | null
  ends_at: string | null
  status: string | null
  paid: boolean
  image_url: string | null
  images: string[] | null
}

type BidRecord = {
  id: string
  amount: number
  user_id: string
  profiles?: {
    username: string | null
  }
}

type RawBidRecord = {
  id: string
  amount: number
  user_id: string
  profiles: { username: string | null } | { username: string | null }[] | null
}

export default function AuctionDetailPage() {
  const { id } = useParams()

  const [auction, setAuction] = useState<AuctionRecord | null>(null)
  const [bids, setBids] = useState<BidRecord[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [hasRequestedSettlement, setHasRequestedSettlement] = useState(false)
  const [bidError, setBidError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('Calculating...')
  const [countdownPhase, setCountdownPhase] = useState<'starts' | 'ends' | 'ended'>('ends')
  const [watcherCount, setWatcherCount] = useState(0)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  const now = Date.now()

  const startsAtMs = useMemo(() => {
    if (!auction?.starts_at) return null
    return new Date(auction.starts_at).getTime()
  }, [auction?.starts_at])

  const endsAtMs = useMemo(() => {
    if (!auction?.ends_at) return null
    return new Date(auction.ends_at).getTime()
  }, [auction?.ends_at])

  const isScheduled = startsAtMs != null && startsAtMs > now
  const hasEnded =
    auction?.status === 'ended' ||
    (endsAtMs != null && endsAtMs <= now)

  const reserveMet =
    auction?.reserve_price == null ||
    ((bids[0]?.amount ?? 0) >= auction.reserve_price)

  const liveCurrentPrice = useMemo(() => {
    const auctionPrice = auction?.current_price ?? 0
    const topBidAmount = bids[0]?.amount ?? 0
    return Math.max(auctionPrice, topBidAmount)
  }, [auction?.current_price, bids])

  const isWinner =
    hasEnded && reserveMet && bids.length > 0 && bids[0]?.user_id === userId

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!id) return

    const loadAuction = async () => {
      const { data: auctionData } = await supabasePublic
        .from('auctions')
        .select(
          'id, title, description, current_price, min_increment, max_increment, reserve_price, sale_source, seller_name, seller_phone, ends_at, status, paid, image_url, images, starts_at'
        )
        .eq('id', id)
        .maybeSingle()

      setAuction(auctionData)
      setLoading(false)
    }

    loadAuction()
  }, [id])

  const loadBids = useCallback(async () => {
    if (!id) return

    const { data: bidsData, error } = await supabasePublic
      .from('bids')
      .select(
        'id, amount, user_id, profiles (username)'
      )
      .eq('auction_id', id)
      .order('amount', { ascending: false })

    if (!error && bidsData) {
      const normalized = (bidsData as RawBidRecord[]).map((bid) => ({
        ...bid,
        profiles: Array.isArray(bid.profiles)
          ? bid.profiles[0] ?? undefined
          : bid.profiles ?? undefined,
      }))

      setBids(normalized)
    }
  }, [id])

  useEffect(() => {
    if (!id) return

    loadBids()

    const subscription = supabasePublic
      .channel(`bids:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${id}`,
        },
        () => {
          loadBids()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [id, loadBids])

  useEffect(() => {
    if (!auction?.id) return
    if (!hasEnded) return
    if (auction.status === 'ended') return
    if (hasRequestedSettlement) return

    setHasRequestedSettlement(true)

    const settleAuction = async () => {
      try {
        await fetch('/api/auctions/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auction_id: auction.id }),
        })

        setAuction((prev) => (prev ? { ...prev, status: 'ended' } : prev))
        await loadBids()
      } catch {
        // No-op: settlement can be retried on refresh if network fails
      }
    }

    settleAuction()
  }, [auction?.id, auction?.status, hasEnded, hasRequestedSettlement, loadBids])

  useEffect(() => {
    const startsAt = auction?.starts_at
    const endsAt = auction?.ends_at
    if (!startsAt && !endsAt) return

    const formatDuration = (diff: number) => {
      const s = Math.floor((diff / 1000) % 60)
      const m = Math.floor((diff / (1000 * 60)) % 60)
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))

      const parts: string[] = []
      if (d) parts.push(`${d}d`)
      if (h) parts.push(`${h}h`)
      if (m) parts.push(`${m}m`)
      parts.push(`${s}s`)

      return parts.join(' ')
    }

    const tick = () => {
      const nowMs = Date.now()
      const startsAtMs = startsAt ? new Date(startsAt).getTime() : null
      const endsAtMs = endsAt ? new Date(endsAt).getTime() : null

      if (startsAtMs != null && nowMs < startsAtMs) {
        setCountdownPhase('starts')
        setTimeLeft(formatDuration(startsAtMs - nowMs))
        return
      }

      if (endsAtMs != null && nowMs < endsAtMs) {
        setCountdownPhase('ends')
        setTimeLeft(formatDuration(endsAtMs - nowMs))
        return
      }

      setCountdownPhase('ended')
      setTimeLeft('Auction Ended')
    }

    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [auction?.starts_at, auction?.ends_at])

  const placeBid = async () => {
    if (!userId) {
      setBidError('You must be logged in')
      return
    }

    if (isScheduled) {
      setBidError('Auction has not started yet')
      return
    }

    if (hasEnded) {
      setBidError('Auction has ended')
      return
    }

    const amount = Number(bidAmount)
    if (!amount || amount <= liveCurrentPrice) {
      setBidError('Bid must be higher than current price')
      return
    }

    const increment = amount - liveCurrentPrice
    const minIncrement = Number(auction?.min_increment ?? 1)
    const maxIncrement = auction?.max_increment == null ? null : Number(auction.max_increment)

    if (Number.isFinite(minIncrement) && minIncrement > 0 && increment < minIncrement) {
      setBidError(`Bid must be at least GHS ${minIncrement.toLocaleString()} above current price`)
      return
    }

    if (maxIncrement != null && Number.isFinite(maxIncrement) && maxIncrement > 0 && increment > maxIncrement) {
      setBidError(`Bid cannot be more than GHS ${maxIncrement.toLocaleString()} above current price`)
      return
    }

    try {
      setIsPlacingBid(true)
      setBidError(null)

      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auction!.id,
          user_id: userId,
          amount,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setBidError(data.error)
        return
      }

      setBidAmount('')
      await loadBids()
    } finally {
      setIsPlacingBid(false)
    }
  }

  const bidderCount = useMemo(() => {
    const userIds = new Set(bids.map((bid) => bid.user_id).filter(Boolean))
    return userIds.size
  }, [bids])

  const loadEngagement = useCallback(async () => {
    if (!id) return

    const res = await fetch(`/api/auctions/engagement?auctionIds=${id}`)
    if (!res.ok) return

    const data = (await res.json()) as {
      counts?: Record<string, { bidderCount: number; watcherCount: number }>
    }

    const counts = data.counts?.[String(id)]
    if (counts) {
      setWatcherCount(counts.watcherCount ?? 0)
    }
  }, [id])

  useEffect(() => {
    if (!id) return

    const viewerKey = getOrCreateViewerKey()

    const trackView = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (viewerKey) {
        await fetch('/api/auctions/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auction_id: id,
            viewer_key: viewerKey,
            user_id: user?.id ?? null,
            action: 'view',
          }),
        })
      }

      await loadEngagement()
    }

    trackView()
  }, [id, loadEngagement])

  useEffect(() => {
    if (!isScheduled) return

    const timer = setInterval(() => {
      loadEngagement()
    }, 15000)

    return () => clearInterval(timer)
  }, [isScheduled, loadEngagement])

  const payNow = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user || !auth.user.email) {
      alert('You must be logged in')
      return
    }

    const res = await fetch('/api/paystack/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: auction!.id,
        user_id: auth.user.id,
        email: auth.user.email,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Payment failed')
      return
    }

    if (!data.authorization_url) {
      alert('Payment initialization failed - no authorization URL received')
      return
    }

    window.location.href = data.authorization_url
  }

  if (loading) return <p className="p-6">Loading auction...</p>
  if (!auction) return <p className="p-6 text-red-500">Auction not found</p>

  const { description: publicDescription, meta } = parseAuctionMeta(auction.description)
  const saleSource = auction.sale_source ?? meta?.saleSource ?? 'gavel'
  const sellerName = auction.seller_name ?? meta?.sellerName ?? null
  const sellerPhone = auction.seller_phone ?? meta?.sellerPhone ?? null

  const formattedDescription = (publicDescription ?? '')
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const shouldShowReadMore =
    formattedDescription.length > 220 || formattedDescription.split('\n').length > 3

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
  const productUrl = `${siteUrl}${buildAuctionPath(auction.id, auction.title)}`
  const imageUrl = auction.images?.[0] || auction.image_url || `${siteUrl}/share/auction/${auction.id}/opengraph-image`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: auction.title,
    description: formattedDescription || `Auction listing for ${auction.title}`,
    image: [imageUrl],
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GHS',
      price: auction.current_price,
      availability: hasEnded ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: productUrl,
    },
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <ImageGallery
            images={
              auction.images && auction.images.length > 0
                ? auction.images
                : auction.image_url
                ? [auction.image_url]
                : []
            }
          />

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <AuctionHeader
                title={auction.title}
                currentPrice={liveCurrentPrice}
                bidderCount={bidderCount}
                watcherCount={watcherCount}
                showBidders={!hasEnded && !isScheduled}
                showWatchers={!hasEnded && isScheduled}
              />
              <ShareAuctionButton auctionId={auction.id} />
            </div>

            {(auction.starts_at || auction.ends_at) && (
              <AuctionCountdown
                targetAt={countdownPhase === 'starts' ? auction.starts_at : auction.ends_at}
                phase={countdownPhase}
                timeLeft={timeLeft}
              />
            )}

            <p
              className="text-gray-700 leading-relaxed whitespace-pre-line"
              style={
                !descriptionExpanded && shouldShowReadMore
                  ? {
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }
                  : undefined
              }
            >
              {formattedDescription || 'No description provided.'}
            </p>

            {shouldShowReadMore && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((previous) => !previous)}
                className="text-sm font-medium text-black underline underline-offset-2"
              >
                {descriptionExpanded ? 'Read less' : 'Read more'}
              </button>
            )}

            <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
              <div>
                <div className="font-medium">Sale Source</div>
                <div>{saleSource === 'seller' ? 'External seller' : 'Gavel'}</div>
              </div>
              {saleSource === 'seller' && (
                <>
                  {sellerPhone && (
                    <div>
                      <div className="font-medium">Seller Phone</div>
                      <div>{sellerPhone}</div>
                    </div>
                  )}
                </>
              )}
              {auction.starts_at && (
                <div>
                  <div className="font-medium">Starts</div>
                  <div>{new Date(auction.starts_at).toLocaleString()}</div>
                </div>
              )}
              {auction.ends_at && (
                <div>
                  <div className="font-medium">Ends</div>
                  <div>{new Date(auction.ends_at).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          {isScheduled && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              This auction has not started yet.
            </div>
          )}
          {hasEnded && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              This auction has ended.
            </div>
          )}
          {hasEnded && !reserveMet && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Sorry, the final bid did not hit the reserve price.</p>
              <p className="mt-1">This item was not sold, and your bid tokens will be refunded.</p>
              <Link href="/faq#reserve-price" className="mt-2 inline-block font-medium underline underline-offset-2">
                What does reserve price mean?
              </Link>
            </div>
          )}

          <BidForm
            hasEnded={hasEnded || isScheduled}
            bidAmount={bidAmount}
            isPlacingBid={isPlacingBid}
            error={bidError}
            isLoggedIn={!!userId}
            minIncrement={auction.min_increment}
            maxIncrement={auction.max_increment}
            onBidAmountChange={setBidAmount}
            onSubmit={placeBid}
          />

          <WinnerPanel
            hasEnded={hasEnded}
            isWinner={isWinner}
            paid={auction.paid}
            onPay={payNow}
          />
        </aside>
      </div>

      <BidList bids={bids} currentUserId={userId} />
    </main>
  )
}
