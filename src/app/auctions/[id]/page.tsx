'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MapPin, Clock, Store, ChevronDown, ChevronUp, Truck } from 'lucide-react'
import { supabase, getSessionHeaders } from '@/lib/supabaseClient'
import { supabasePublic } from '@/lib/supabasePublicClient'
import { useTopToast } from '@/components/ui/TopToastProvider'

import AuctionHeader from '@/components/auction/AuctionHeader'
import AuctionCountdown from '@/components/auction/AuctionCountdown'
import BidForm from '@/components/auction/BidForm'
import BidList from '@/components/auction/BidList'
import WinnerPanel from '@/components/auction/WinnerPanel'
import ImageGallery from '@/components/auction/ImageGallery'
import ShareAuctionButton from '@/components/auction/ShareAuctionButton'
import PrivateAuctionGuard from '@/components/auction/PrivateAuctionGuard'
import { parseAuctionMeta } from '@/lib/auctionMeta'
import { buildAuctionPath } from '@/lib/seo'
import { getOrCreateViewerKey } from '@/lib/engagement'
import { ALL_LOCATIONS } from '@/lib/ghanaLocations'
import { normalizeAuctionImageUrls } from '@/lib/auctionImages'

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
  seller_shop_id?: string | null
  seller_shop_name?: string | null
  seller_phone: string | null
  starts_at: string | null
  ends_at: string | null
  status: string | null
  paid: boolean
  winning_bid_id: string | null
  auction_payment_due_at: string | null
  image_url: string | null
  images: unknown[] | null
  is_private?: boolean
  anonymous_bidding_enabled?: boolean | null
  delivery_zones?: Array<{
    location_value: string
    delivery_price: number
    delivery_time_days: number
  }>
}

type BidRecord = {
  id: string
  amount: number
  user_id: string
  masked_email?: string | null
  profiles?: {
    username: string | null
  }
}

export default function AuctionDetailPage() {
  const { notify } = useTopToast()
  const params = useParams<{ id?: string | string[] }>()
  const auctionId = useMemo(() => {
    const rawId = params?.id
    const idValue = Array.isArray(rawId) ? rawId[0] : rawId
    if (!idValue) return null

    const decoded = decodeURIComponent(String(idValue)).trim()
    if (!decoded) return null

    const cleaned = decoded.split(',')[0].split('/')[0].trim()
    return cleaned || null
  }, [params])

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

  const activeWinningBid = useMemo(() => {
    if (!auction?.winning_bid_id) return null
    return bids.find((bid) => bid.id === auction.winning_bid_id) ?? null
  }, [auction?.winning_bid_id, bids])

  const fallbackWinningBid = useMemo(() => {
    if (!hasEnded) return null
    if (activeWinningBid) return activeWinningBid
    return bids[0] ?? null
  }, [activeWinningBid, bids, hasEnded])

  const reserveMet = useMemo(() => {
    if (!auction) return false
    if (auction.reserve_price == null) return true
    if (activeWinningBid) return true

    const reservePrice = Number(auction.reserve_price)
    const highestBidAmount = Number(bids[0]?.amount ?? 0)
    if (!Number.isFinite(reservePrice) || !Number.isFinite(highestBidAmount)) return false

    return highestBidAmount + Number.EPSILON >= reservePrice
  }, [activeWinningBid, auction, bids])

  const liveCurrentPrice = useMemo(() => {
    const auctionPrice = auction?.current_price ?? 0
    const topBidAmount = bids[0]?.amount ?? 0
    return Math.max(auctionPrice, topBidAmount)
  }, [auction?.current_price, bids])

  const isWinner =
    hasEnded &&
    reserveMet &&
    !!fallbackWinningBid &&
    fallbackWinningBid.user_id === userId

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const loadAuction = useCallback(async () => {
    if (!auctionId) return

    const selectFields =
      'id, title, description, current_price, min_increment, max_increment, reserve_price, sale_source, seller_name, seller_phone, ends_at, status, paid, winning_bid_id, image_url, images, starts_at, is_private, anonymous_bidding_enabled'

    let auctionData: AuctionRecord | null = null

    const apiRes = await fetch(`/api/auctions/${encodeURIComponent(auctionId)}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (apiRes.ok) {
      const payload = (await apiRes.json()) as { auction?: AuctionRecord }
      if (payload.auction) {
        setAuction(payload.auction)
        setLoading(false)
        return
      }
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data } = await supabasePublic
        .from('auctions')
        .select(selectFields)
        .eq('id', auctionId)
        .maybeSingle()

      if (data) {
        const normalized = data as AuctionRecord & { auction_payment_due_at?: string | null }
        auctionData = {
          ...normalized,
          auction_payment_due_at: normalized.auction_payment_due_at ?? null,
        }
        break
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: ownerVisible } = await supabase
          .from('auctions')
          .select(selectFields)
          .eq('id', auctionId)
          .maybeSingle()

        if (ownerVisible) {
          const normalized = ownerVisible as AuctionRecord & { auction_payment_due_at?: string | null }
          auctionData = {
            ...normalized,
            auction_payment_due_at: normalized.auction_payment_due_at ?? null,
          }
          break
        }
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 450))
      }
    }

    setAuction(auctionData)
    setLoading(false)
  }, [auctionId])

  useEffect(() => {
    loadAuction()
  }, [loadAuction])

  const loadBids = useCallback(async () => {
    if (!auctionId) return

    const res = await fetch(`/api/bids?auction_id=${encodeURIComponent(auctionId)}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!res.ok) return

    const payload = (await res.json()) as { bids?: BidRecord[] }
    if (payload.bids) {
      setBids(payload.bids)
    }
  }, [auctionId])

  useEffect(() => {
    if (!auctionId) return

    loadBids()
    loadAuction()

    const bidsSubscription = supabasePublic
      .channel(`bids:${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          loadBids()
          loadAuction()
        }
      )
      .subscribe()

    const auctionSubscription = supabasePublic
      .channel(`auction:${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        () => {
          loadAuction()
        }
      )
      .subscribe()

    // Fallback polling to ensure data freshness (especially for admin bid deletions)
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }
      loadAuction()
    }, 12000)

    return () => {
      bidsSubscription.unsubscribe()
      auctionSubscription.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [auctionId, loadAuction, loadBids])

  useEffect(() => {
    if (!auction?.id) return
    if (!hasEnded) return
    if (auction.status === 'ended') return
    if (hasRequestedSettlement) return

    setHasRequestedSettlement(true)

    const settleAuction = async () => {
      try {
        const res = await fetch('/api/auctions/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auction_id: auction.id }),
        })

        if (!res.ok) return

        const result = (await res.json()) as {
          winningBidId?: string | null
          paymentDueAt?: string | null
        }

        setAuction((prev) =>
          prev
            ? {
                ...prev,
                status: 'ended',
                winning_bid_id: result.winningBidId ?? prev.winning_bid_id,
                auction_payment_due_at: result.paymentDueAt ?? prev.auction_payment_due_at,
              }
            : prev
        )
        await loadAuction()
        await loadBids()
      } catch {
        // No-op: settlement can be retried on refresh if network fails
      }
    }

    settleAuction()
  }, [auction?.id, auction?.status, hasEnded, hasRequestedSettlement, loadAuction, loadBids])

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
      setBidError(`Bid must be at least GH₵ ${minIncrement.toLocaleString()} above current price`)
      return
    }

    if (maxIncrement != null && Number.isFinite(maxIncrement) && maxIncrement > 0 && increment > maxIncrement) {
      setBidError(`Bid cannot be more than GH₵ ${maxIncrement.toLocaleString()} above current price`)
      return
    }

    try {
      setIsPlacingBid(true)
      setBidError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/bids', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          auction_id: auction!.id,
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
      await loadAuction()
    } finally {
      setIsPlacingBid(false)
    }
  }

  const bidderCount = useMemo(() => {
    const userIds = new Set(bids.map((bid) => bid.user_id).filter(Boolean))
    return userIds.size
  }, [bids])

  const loadEngagement = useCallback(async () => {
    if (!auctionId) return

    const res = await fetch(`/api/auctions/engagement?auctionIds=${encodeURIComponent(auctionId)}`)
    if (!res.ok) return

    const data = (await res.json()) as {
      counts?: Record<string, { bidderCount: number; watcherCount: number }>
    }

    const counts = data.counts?.[auctionId]
    if (counts) {
      setWatcherCount(counts.watcherCount ?? 0)
    }
  }, [auctionId])

  useEffect(() => {
    if (!auctionId) return

    const viewerKey = getOrCreateViewerKey()

    const trackView = async () => {
      if (!viewerKey) return
      const headers = await getSessionHeaders()
      headers['Content-Type'] = 'application/json'
      await fetch('/api/auctions/engagement', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          auction_id: auctionId,
          viewer_key: viewerKey,
          action: 'view',
        }),
      })

      await loadEngagement()
    }

    trackView()
  }, [auctionId, loadEngagement])

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
      notify({
        title: 'Authentication Required',
        description: 'You must be logged in to make payments',
        variant: 'warning',
      })
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
      notify({
        title: 'Payment Failed',
        description: data.error || 'Unable to start payment',
        variant: 'error',
      })
      return
    }

    if (!data.authorization_url) {
      notify({
        title: 'Payment Error',
        description: 'Payment initialization failed - no authorization URL received',
        variant: 'error',
      })
      return
    }

    window.location.href = data.authorization_url
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-orange-500 animate-spin" />
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-gray-900">Auction not found</p>
        <p className="mt-1 text-sm text-gray-500">This auction may have been removed or doesn&apos;t exist.</p>
        <Link href="/auctions" className="mt-4 inline-block rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white">
          Browse auctions
        </Link>
      </div>
    )
  }

  const { description: publicDescription, meta } = parseAuctionMeta(auction.description)
  const saleSource = auction.sale_source ?? meta?.saleSource ?? 'gavel'

  const formattedDescription = (publicDescription ?? '')
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const shouldShowReadMore =
    formattedDescription.length > 220 || formattedDescription.split('\n').length > 3
  const deliveryZones = Array.isArray(auction.delivery_zones) ? auction.delivery_zones : []
  const deliveryDays = deliveryZones
    .map((zone) => Number(zone.delivery_time_days ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0)
  const minDeliveryDays = deliveryDays.length ? Math.min(...deliveryDays) : null
  const maxDeliveryDays = deliveryDays.length ? Math.max(...deliveryDays) : null

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
  const productUrl = `${siteUrl}${buildAuctionPath(auction.id, auction.title)}`
  const fallbackImages = normalizeAuctionImageUrls(auction.images, auction.image_url)
  const imageUrl = fallbackImages[0] || `${siteUrl}/share/auction/${auction.id}/opengraph-image`
  const sellerDisplayName =
    (auction.seller_name || auction.seller_shop_name || '').trim() || 'External Seller'
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AuctionEvent',
    name: auction.title,
    description: formattedDescription || `Auction listing for ${auction.title}`,
    url: productUrl,
    image: imageUrl,
    startDate: auction.starts_at,
    endDate: auction.ends_at,
    eventStatus: hasEnded ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    location: {
      '@type': 'VirtualLocation',
      url: productUrl
    },
    organizer: {
      '@type': 'Organization',
      name: 'Gavel Ghana',
      url: siteUrl
    },
    offers: {
      '@type': 'Offer',
      price: liveCurrentPrice,
      priceCurrency: 'GHS',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: sellerDisplayName,
      }
    }
  }

  return (
    <PrivateAuctionGuard
      auctionId={auction.id}
      auctionTitle={auction.title}
      isPrivate={auction.is_private}
    >
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8 md:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/auctions" className="hover:text-gray-600 transition-colors">Auctions</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium line-clamp-1">{auction.title}</span>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          {/* Left column */}
          <section className="space-y-4">
            {/* Image gallery */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
              <ImageGallery images={fallbackImages} />
            </div>

            {/* Title + share */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
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

              {/* Private auction notice */}
              {auction.is_private && (
                <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-3">
                  <p className="text-xs font-semibold text-purple-800">Private Auction</p>
                  <p className="mt-0.5 text-xs text-purple-700">
                    {auction.anonymous_bidding_enabled === false
                      ? 'Anonymous bidding is off. Bidder usernames are visible to participants.'
                      : 'Anonymous bidding is on. Bidder identities are hidden.'}
                  </p>
                </div>
              )}
            </div>

            {/* Seller + end date info */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Store className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {saleSource === 'seller' ? 'Seller' : 'Sale Source'}
                    </p>
                    <div className="font-semibold text-gray-800">
                      {saleSource === 'seller' && auction.seller_shop_id ? (
                        <Link href={`/shop/seller/${auction.seller_shop_id}`} className="text-orange-600 hover:text-orange-700 transition-colors">
                          {sellerDisplayName}
                        </Link>
                      ) : saleSource === 'seller' ? (
                        sellerDisplayName
                      ) : (
                        'Gavel Products'
                      )}
                    </div>
                  </div>
                </div>
                {auction.ends_at && (
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Ends</p>
                      <p className="font-semibold text-gray-800">{new Date(auction.ends_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery zones */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900">Delivery Information</h2>
              </div>
              {deliveryZones.length > 0 ? (
                <>
                  {(minDeliveryDays || maxDeliveryDays) && (
                    <p className="text-xs text-gray-500 mb-3">
                      Estimated delivery:{' '}
                      <span className="font-semibold text-gray-700">
                        {minDeliveryDays}{maxDeliveryDays !== minDeliveryDays ? `–${maxDeliveryDays}` : ''} day(s)
                      </span>
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {deliveryZones.slice(0, 8).map((zone) => {
                      const locationLabel =
                        ALL_LOCATIONS.find((location) => location.value === zone.location_value)?.label || zone.location_value
                      return (
                        <div key={`${zone.location_value}-${zone.delivery_price}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                          <div className="flex items-center gap-1.5 text-gray-700 font-medium truncate">
                            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            {locationLabel}
                          </div>
                          <span className="whitespace-nowrap font-semibold text-gray-800">
                            GH₵ {Number(zone.delivery_price).toLocaleString()} · {zone.delivery_time_days}d
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Seller delivery zones are not configured yet.</p>
              )}
            </div>

            {/* Description */}
            {formattedDescription ? (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Description</h2>
                <p
                  className="text-sm text-gray-600 leading-relaxed whitespace-pre-line"
                  style={
                    !descriptionExpanded && shouldShowReadMore
                      ? {
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }
                      : undefined
                  }
                >
                  {formattedDescription}
                </p>
                {shouldShowReadMore && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded((prev) => !prev)}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    {descriptionExpanded ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> Read more</>
                    )}
                  </button>
                )}
              </div>
            ) : null}
          </section>

          {/* Right column / sidebar */}
          <aside className="space-y-4">
            {/* Countdown */}
            {(auction.starts_at || auction.ends_at) && (
              <AuctionCountdown
                targetAt={countdownPhase === 'starts' ? auction.starts_at : auction.ends_at}
                phase={countdownPhase}
                timeLeft={timeLeft}
              />
            )}

            {/* Status banners */}
            {isScheduled && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Auction not started yet</p>
                <p className="mt-0.5 text-xs text-amber-700">Bidding will open when the auction starts.</p>
              </div>
            )}
            {hasEnded && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">This auction has ended</p>
              </div>
            )}
            {hasEnded && !reserveMet && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Reserve price not met</p>
                <p className="mt-1 text-xs text-amber-700">
                  The final bid didn&apos;t reach the reserve price. This item was not sold.
                </p>
                <Link href="/contact#reserve-price" className="mt-2 inline-block text-xs font-semibold text-amber-800 underline underline-offset-2">
                  Learn about reserve prices
                </Link>
              </div>
            )}

            {/* Bid form */}
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

            {/* Winner panel */}
            <WinnerPanel
              hasEnded={hasEnded}
              isWinner={isWinner}
              paid={auction.paid}
              paymentDueAt={auction.auction_payment_due_at}
              onPay={payNow}
            />
          </aside>
        </div>

        {/* Bid list */}
        <div className="mt-5">
          <BidList bids={bids} currentUserId={userId} />
        </div>
      </main>
    </PrivateAuctionGuard>
  )
}
