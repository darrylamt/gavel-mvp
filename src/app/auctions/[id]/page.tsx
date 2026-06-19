'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Clock, Store, ChevronDown, ChevronUp, X } from 'lucide-react'
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
  buy_now_price?: number | null
  shop_product_id?: string | null
  seller_id?: string | null
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
  const router = useRouter()
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
  const [cdParts, setCdParts] = useState({ d: 0, h: 0, m: 0, s: 0 })
  const [isBuyingNow, setIsBuyingNow] = useState(false)
  const [buyNowError, setBuyNowError] = useState<string | null>(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false)
  const [offerError, setOfferError] = useState<string | null>(null)
  const [offerSuccess, setOfferSuccess] = useState(false)
  const [sellerLogoUrl, setSellerLogoUrl] = useState<string | null>(null)

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

  useEffect(() => {
    if (!auction?.seller_shop_id) return
    supabasePublic
      .from('shops')
      .select('logo_url')
      .eq('id', auction.seller_shop_id)
      .maybeSingle()
      .then(({ data }) => { if (data?.logo_url) setSellerLogoUrl(data.logo_url) })
  }, [auction?.seller_shop_id])

  const loadAuction = useCallback(async () => {
    if (!auctionId) return

    const selectFields =
      'id, title, description, current_price, min_increment, max_increment, reserve_price, sale_source, seller_name, seller_phone, seller_id, ends_at, status, paid, winning_bid_id, image_url, images, starts_at, is_private, anonymous_bidding_enabled, buy_now_price, shop_product_id'

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
    // Best-effort, on-page settlement fallback. Fire only when the auction is
    // genuinely unsettled: ended, not paid, and with no winning candidate yet.
    // This used to be gated on `status !== 'ended'`, which meant that once the
    // cron (or any path) flipped status to 'ended' WITHOUT assigning a winner,
    // this fallback could never run and the auction stayed winner-less forever.
    if (auction.paid) return
    if (auction.winning_bid_id) return
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
  }, [auction?.id, auction?.paid, auction?.winning_bid_id, hasEnded, hasRequestedSettlement, loadAuction, loadBids])

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
        const diff = startsAtMs - nowMs
        setCountdownPhase('starts')
        setTimeLeft(formatDuration(diff))
        setCdParts({
          d: Math.floor(diff / 86400000),
          h: Math.floor((diff % 86400000) / 3600000),
          m: Math.floor((diff % 3600000) / 60000),
          s: Math.floor((diff % 60000) / 1000),
        })
        return
      }

      if (endsAtMs != null && nowMs < endsAtMs) {
        const diff = endsAtMs - nowMs
        setCountdownPhase('ends')
        setTimeLeft(formatDuration(diff))
        setCdParts({
          d: Math.floor(diff / 86400000),
          h: Math.floor((diff % 86400000) / 3600000),
          m: Math.floor((diff % 3600000) / 60000),
          s: Math.floor((diff % 60000) / 1000),
        })
        return
      }

      setCountdownPhase('ended')
      setTimeLeft('Auction Ended')
      setCdParts({ d: 0, h: 0, m: 0, s: 0 })
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

  const handleBuyNow = async () => {
    if (!userId) { setBuyNowError('You must be logged in to buy now'); return }
    if (!auction?.buy_now_price) return
    setIsBuyingNow(true)
    setBuyNowError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/auctions/buy-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ auction_id: auction.id }),
      })
      const data = await res.json()
      if (!res.ok) { setBuyNowError(data.error || 'Failed to process purchase'); return }
      router.push(data.payPath)
    } catch {
      setBuyNowError('Something went wrong. Please try again.')
    } finally {
      setIsBuyingNow(false)
    }
  }

  const handleSubmitOffer = async () => {
    if (!offerAmount || Number(offerAmount) <= 0) { setOfferError('Please enter a valid offer amount'); return }
    setIsSubmittingOffer(true); setOfferError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/auctions/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ auction_id: auction!.id, amount: Number(offerAmount), message: offerMessage }),
      })
      const data = await res.json()
      if (!res.ok) { setOfferError(data.error || 'Failed to submit offer'); return }
      setOfferSuccess(true)
      setOfferAmount(''); setOfferMessage('')
    } catch { setOfferError('Something went wrong. Please try again.') }
    finally { setIsSubmittingOffer(false) }
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

  const showMobileBidBar = !hasEnded && !isScheduled && !!userId
  const isEnding = !hasEnded && endsAtMs != null && (endsAtMs - Date.now()) < 1000 * 60 * 5
  const isUrgent = !hasEnded && endsAtMs != null && (endsAtMs - Date.now()) < 1000 * 60 * 60
  const lotId = auction.id.slice(0, 8).toUpperCase()
  const increment = auction.min_increment ?? 500
  const quickBids = [increment, increment * 2, increment * 5, increment * 10]

  return (
    <PrivateAuctionGuard auctionId={auction.id} auctionTitle={auction.title} isPrivate={auction.is_private}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Mobile sticky bid bar */}
      {showMobileBidBar && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-gray-200 dark:border-[#232830] bg-white dark:bg-[#14181f] shadow-[0_-4px_24px_rgba(0,0,0,0.10)] px-4 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960]">Current bid</span>
            <span className="text-sm font-black text-gray-900 dark:text-[#f4f1ea] tabular-nums">GHS {liveCurrentPrice.toLocaleString()}</span>
            <span className="ml-auto text-[10px] font-mono text-gray-400 dark:text-[#6b6960]">{bidderCount} bidder{bidderCount !== 1 ? 's' : ''}</span>
          </div>
          <BidForm hasEnded={false} bidAmount={bidAmount} isPlacingBid={isPlacingBid} error={bidError} isLoggedIn
            currentPrice={liveCurrentPrice} minIncrement={auction.min_increment} maxIncrement={auction.max_increment}
            onBidAmountChange={setBidAmount} onSubmit={placeBid} compact />
          {bidError && <p className="mt-1.5 text-xs text-red-400">{bidError}</p>}
        </div>
      )}

      <div className={`bg-white dark:bg-[#0a0c10] text-gray-900 dark:text-[#f4f1ea] min-h-screen ${showMobileBidBar ? 'pb-32 lg:pb-0' : ''}`}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 dark:text-[#6b6960] mb-6">
            <Link href="/" className="hover:text-gray-900 dark:text-[#f4f1ea] transition-colors">Home</Link>
            <span>›</span>
            <Link href="/auctions" className="hover:text-gray-900 dark:text-[#f4f1ea] transition-colors">Auctions</Link>
            <span>›</span>
            <span className="text-gray-600 dark:text-[#b8b3a8] truncate max-w-[200px]">{auction.title}</span>
          </nav>

          {/* Hero grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 mb-10">

            {/* Left: Gallery + title block */}
            <div className="space-y-5">
              <div className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-[#11141a]">
                <ImageGallery images={fallbackImages} />
              </div>

              {/* Title block */}
              <div>
                <p className="font-mono text-[11px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960] mb-2">LOT {lotId}</p>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#f4f1ea] leading-tight">{auction.title}</h1>
                  <ShareAuctionButton auctionId={auction.id} />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {!hasEnded && !isScheduled && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-600/40 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      Live auction
                    </span>
                  )}
                  {isScheduled && <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">Scheduled</span>}
                  {hasEnded && <span className="rounded-full border border-gray-200 dark:border-[#232830] bg-gray-50 dark:bg-[#11141a] px-2.5 py-0.5 text-[11px] font-semibold text-gray-400 dark:text-[#6b6960]">Ended</span>}
                  {reserveMet && !hasEnded && <span className="rounded-full border border-green-600/40 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">Reserve met</span>}
                  {!reserveMet && !hasEnded && bids.length > 0 && <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">Reserve not met</span>}
                </div>
              </div>

              {/* Private auction notice */}
              {auction.is_private && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm font-semibold text-purple-300">Private Auction</p>
                  <p className="mt-0.5 text-xs text-purple-400">
                    {auction.anonymous_bidding_enabled === false ? 'Anonymous bidding is off.' : 'Anonymous bidding is on. Bidder identities are hidden.'}
                  </p>
                </div>
              )}

              {/* Description */}
              {formattedDescription && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-[#f4f1ea] mb-3">Description</h2>
                  <p className="text-sm text-gray-600 dark:text-[#b8b3a8] leading-relaxed whitespace-pre-line"
                    style={!descriptionExpanded && shouldShowReadMore ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}>
                    {formattedDescription}
                  </p>
                  {shouldShowReadMore && (
                    <button type="button" onClick={() => setDescriptionExpanded(p => !p)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                      {descriptionExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Read more</>}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Sticky auction panel */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-4">

              {/* Buy Now card — only shown while scheduled */}
              {isScheduled && auction.buy_now_price && !hasEnded && (
                <div className="bg-white dark:bg-[#14181f] border border-[#C9A84C]/40 rounded-2xl p-5 shadow-[0_0_0_1px_rgba(201,168,76,0.15)]">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-[#C9A84C] mb-1">Buy Now</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-[#f4f1ea] mb-1">
                    GHS {auction.buy_now_price.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#6b6960] mb-4">
                    Skip the auction – buy immediately at this price. Available until auction starts.
                  </p>
                  {buyNowError && <p className="text-xs text-red-400 mb-3">{buyNowError}</p>}
                  <button
                    onClick={handleBuyNow}
                    disabled={isBuyingNow || !userId}
                    className="w-full rounded-xl bg-[#C9A84C] text-[#0a0c10] font-bold py-3 text-sm hover:brightness-105 transition-all disabled:opacity-50"
                  >
                    {isBuyingNow ? 'Processing…' : 'Buy Now'}
                  </button>
                  {!userId && (
                    <p className="text-center text-xs text-gray-400 dark:text-[#6b6960] mt-2">
                      <Link href="/login" className="text-orange-400 hover:text-orange-300">Log in</Link> to buy now
                    </p>
                  )}
                </div>
              )}

              {/* Main ticker card */}
              <div className={`bg-white dark:bg-[#14181f] border rounded-2xl overflow-hidden transition-all ${isEnding ? 'border-orange-500 shadow-[0_0_0_1px_rgba(249,115,22,0.5),0_20px_60px_-20px_rgba(249,115,22,0.2)]' : 'border-gray-200 dark:border-[#232830]'}`}>

                {/* Status strip */}
                <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-gray-200 dark:border-[#232830] ${isEnding ? 'bg-orange-500/10' : 'bg-gray-50 dark:bg-[#11141a]'}`}>
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${hasEnded ? 'bg-[#6b6960]' : 'bg-orange-500 animate-pulse'}`} />
                  <span className="font-mono text-[11px] tracking-widest uppercase text-gray-900 dark:text-[#f4f1ea]">
                    {hasEnded ? 'Auction closed' : isEnding ? 'Closing soon' : isScheduled ? 'Starting soon' : 'Live auction'}
                  </span>
                </div>

                <div className="p-5">
                  {/* Current bid */}
                  <div className="flex items-end justify-between mb-2">
                    <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960]">
                      {hasEnded ? 'Final price' : 'Current bid'}
                    </p>
                    {reserveMet
                      ? <span className="rounded-full bg-green-500/15 border border-green-600/40 px-2 py-0.5 text-[10px] font-semibold text-green-400">● Reserve met</span>
                      : bids.length > 0
                        ? <span className="rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-400">● Reserve not met</span>
                        : null
                    }
                  </div>
                  <p className="text-3xl font-bold text-orange-400 mb-1 tabular-nums">
                    GHS {liveCurrentPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#6b6960] mb-5">
                    {bids.length} bid{bids.length !== 1 ? 's' : ''} · {watcherCount > 0 ? `${watcherCount} watching` : `${bidderCount} bidder${bidderCount !== 1 ? 's' : ''}`}
                  </p>

                  {/* Countdown */}
                  {!hasEnded && (auction.starts_at || auction.ends_at) && (
                    <div className={`rounded-xl border border-gray-200 dark:border-[#232830] p-4 mb-5 ${isUrgent ? 'bg-orange-500/8 border-orange-500/30' : 'bg-gray-50 dark:bg-[#11141a]'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960]">
                          {countdownPhase === 'starts' ? 'Starts in' : 'Closes in'}
                        </p>
                        {countdownPhase === 'starts' && auction.starts_at && (
                          <p className="font-mono text-[10px] text-gray-400 dark:text-[#6b6960]">
                            Starts {new Date(auction.starts_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                        {countdownPhase !== 'starts' && auction.ends_at && (
                          <p className="font-mono text-[10px] text-gray-400 dark:text-[#6b6960]">
                            Ends {new Date(auction.ends_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-baseline gap-3">
                        {[
                          { v: cdParts.d, l: 'days' },
                          { v: cdParts.h, l: 'hrs' },
                          { v: cdParts.m, l: 'min' },
                          { v: cdParts.s, l: 'sec' },
                        ].map((u, i) => (
                          <div key={i} className="flex items-baseline gap-1">
                            <span className={`font-mono font-medium tabular-nums text-[28px] leading-none ${isUrgent ? 'text-orange-400' : 'text-gray-900 dark:text-[#f4f1ea]'}`}>
                              {String(u.v).padStart(2, '0')}
                            </span>
                            <span className="font-mono text-[9px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960]">{u.l}</span>
                            {i < 3 && <span className="text-[#232830] ml-1">·</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bid input – desktop */}
                  {!hasEnded && !isScheduled && (
                    <div className="space-y-3 hidden lg:block">
                      <div>
                        <label className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960] block mb-2">Place your bid</label>
                        <div className="flex gap-2">
                          <div className="flex flex-1 items-center bg-gray-50 dark:bg-[#11141a] border border-gray-200 dark:border-[#232830] rounded-xl px-3 focus-within:border-orange-500/50 transition-colors">
                            <span className="text-gray-400 dark:text-[#6b6960] text-sm mr-1">GHS</span>
                            <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                              placeholder={String(liveCurrentPrice + increment)}
                              className="flex-1 bg-transparent font-mono text-sm text-gray-900 dark:text-[#f4f1ea] py-2.5 outline-none tabular-nums"
                            />
                          </div>
                          <button onClick={placeBid} disabled={isPlacingBid || !bidAmount || Number(bidAmount) <= liveCurrentPrice}
                            className="rounded-xl bg-orange-500 text-white font-bold text-sm px-4 hover:bg-orange-600 transition-colors disabled:opacity-50">
                            {isPlacingBid ? '…' : 'Bid'}
                          </button>
                        </div>
                        {/* Quick-add buttons */}
                        <div className="flex gap-1.5 mt-2">
                          {quickBids.map(b => (
                            <button key={b} onClick={() => setBidAmount(String(liveCurrentPrice + b))}
                              className="flex-1 rounded-lg bg-gray-50 dark:bg-[#11141a] border border-gray-200 dark:border-[#232830] py-1.5 text-[11px] font-mono text-gray-600 dark:text-[#b8b3a8] hover:border-orange-500/40 hover:text-orange-400 transition-colors">
                              +{b >= 1000 ? `${b / 1000}k` : b}
                            </button>
                          ))}
                        </div>
                        {bidError && <p className="mt-2 text-xs text-red-400">{bidError}</p>}
                        {!userId && (
                          <p className="mt-2 text-xs text-gray-400 dark:text-[#6b6960]">
                            <Link href="/login" className="text-orange-400 hover:text-orange-300">Log in</Link> to place a bid
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Winner panel */}
                  <WinnerPanel hasEnded={hasEnded} isWinner={isWinner} paid={auction.paid}
                    paymentDueAt={auction.auction_payment_due_at} onPay={payNow} />

                  {/* Fees row */}
                </div>
              </div>

              {/* Seller card */}
              <div className="bg-white dark:bg-[#14181f] border border-gray-200 dark:border-[#232830] rounded-2xl p-4">
                <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960] mb-3">Seller</p>
                <div className="flex items-center gap-3 mb-4">
                  {sellerLogoUrl ? (
                    <img
                      src={sellerLogoUrl}
                      alt={sellerDisplayName}
                      className="h-10 w-10 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-[#232830]"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white font-bold flex-shrink-0">
                      {(sellerDisplayName || 'G').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-[#f4f1ea]">
                      {saleSource === 'seller' && auction.seller_shop_id
                        ? <Link href={`/shop/seller/${auction.seller_shop_id}`} className="text-orange-400 hover:text-orange-300">{sellerDisplayName}</Link>
                        : sellerDisplayName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-[#6b6960]">{saleSource === 'seller' ? 'Verified seller' : 'Gavel Products'}</p>
                  </div>
                </div>
                {!hasEnded && userId && userId !== auction.seller_id && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="w-full rounded-xl border border-orange-500/40 bg-orange-500/10 py-2.5 text-sm font-semibold text-orange-400 hover:bg-orange-500/20 transition-colors"
                  >
                    Make an Offer
                  </button>
                )}
                {!hasEnded && !userId && (
                  <Link href="/login" className="block text-center w-full rounded-xl border border-gray-200 dark:border-[#232830] py-2.5 text-xs font-medium text-gray-600 dark:text-[#b8b3a8] hover:border-orange-500/30 transition-colors">
                    Log in to make an offer
                  </Link>
                )}
              </div>

              {/* Ends info */}
              {auction.ends_at && (
                <div className="bg-white dark:bg-[#14181f] border border-gray-200 dark:border-[#232830] rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-[#6b6960] flex-shrink-0" />
                  <div>
                    <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960]">Closes</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#f4f1ea]">{new Date(auction.ends_at).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bid history + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 mb-10">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-[#f4f1ea] mb-1">Bid history</h2>
              <p className="text-xs text-gray-400 dark:text-[#6b6960] mb-4">Live · all bids are binding and recorded.</p>
              <BidList bids={bids} currentUserId={userId} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-[#f4f1ea] mb-1">Activity</h2>
              <p className="text-xs text-gray-400 dark:text-[#6b6960] mb-4">Watchers, bidders and engagement.</p>
              <div className="bg-white dark:bg-[#14181f] border border-gray-200 dark:border-[#232830] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-3">
                  {[
                    { l: 'Watching', v: watcherCount || '–' },
                    { l: 'Bidders', v: bidderCount || '–' },
                    { l: 'Bids', v: bids.length || '–' },
                  ].map((s, i, a) => (
                    <div key={i} className={`px-4 py-4 ${i < a.length - 1 ? 'border-r border-gray-200 dark:border-[#232830]' : ''}`}>
                      <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960] mb-1">{s.l}</p>
                      <p className="font-mono text-xl text-gray-900 dark:text-[#f4f1ea]">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Make an Offer modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowOfferModal(false); setOfferSuccess(false); setOfferError(null) }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#14181f] border border-gray-200 dark:border-[#232830] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#232830]">
              <p className="text-sm font-bold text-gray-900 dark:text-[#f4f1ea]">Make an Offer</p>
              <button onClick={() => { setShowOfferModal(false); setOfferSuccess(false); setOfferError(null) }}
                className="rounded-full p-1.5 hover:bg-[#232830] text-gray-400 dark:text-[#6b6960] hover:text-gray-900 dark:text-[#f4f1ea] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {offerSuccess ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">✓</div>
                  <p className="font-semibold text-gray-900 dark:text-[#f4f1ea] mb-1">Offer sent!</p>
                  <p className="text-sm text-gray-400 dark:text-[#6b6960]">The seller will be notified. You&apos;ll receive an SMS if they accept.</p>
                  <button onClick={() => { setShowOfferModal(false); setOfferSuccess(false) }}
                    className="mt-4 w-full rounded-xl bg-orange-500 text-white py-2.5 text-sm font-semibold hover:bg-orange-600 transition-colors">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400 dark:text-[#6b6960] mb-4">
                    Your offer on <span className="text-gray-600 dark:text-[#b8b3a8]">{auction!.title}</span>. The seller will be notified and can accept or decline.
                  </p>

                  <div className="mb-4">
                    <label className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960] block mb-2">Offer amount (GHS)</label>
                    <div className="flex items-center bg-gray-50 dark:bg-[#11141a] border border-gray-200 dark:border-[#232830] rounded-xl px-3 focus-within:border-orange-500/50 transition-colors">
                      <span className="text-gray-400 dark:text-[#6b6960] text-sm mr-1">GHS</span>
                      <input
                        type="number"
                        value={offerAmount}
                        onChange={e => setOfferAmount(e.target.value)}
                        placeholder={String(liveCurrentPrice)}
                        className="flex-1 bg-transparent font-mono text-sm text-gray-900 dark:text-[#f4f1ea] py-3 outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-[#6b6960] block mb-2">Message (optional)</label>
                    <textarea
                      value={offerMessage}
                      onChange={e => setOfferMessage(e.target.value)}
                      placeholder="e.g. I can pay immediately..."
                      rows={2}
                      className="w-full bg-gray-50 dark:bg-[#11141a] border border-gray-200 dark:border-[#232830] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-[#f4f1ea] outline-none focus:border-orange-500/50 resize-none transition-colors placeholder:text-gray-400 dark:text-[#6b6960]"
                    />
                  </div>

                  {offerError && <p className="text-xs text-red-400 mb-3">{offerError}</p>}

                  <button
                    onClick={handleSubmitOffer}
                    disabled={isSubmittingOffer || !offerAmount}
                    className="w-full rounded-xl bg-orange-500 text-white py-3 text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmittingOffer ? 'Sending…' : 'Send Offer'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PrivateAuctionGuard>
  )
}
