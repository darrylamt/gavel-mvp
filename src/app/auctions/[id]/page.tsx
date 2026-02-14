'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

import AuctionHeader from '@/components/auction/AuctionHeader'
import AuctionCountdown from '@/components/auction/AuctionCountdown'
import BidForm from '@/components/auction/BidForm'
import BidList from '@/components/auction/BidList'
import WinnerPanel from '@/components/auction/WinnerPanel'
import ImageGallery from '@/components/auction/ImageGallery'

type AuctionRecord = {
  id: string
  title: string
  description: string | null
  current_price: number
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
  const [bidError, setBidError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('Calculating...')
  const [countdownPhase, setCountdownPhase] = useState<'starts' | 'ends' | 'ended'>('ends')

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

  const isWinner =
    hasEnded && bids.length > 0 && bids[0]?.user_id === userId

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!id) return

    const loadAuction = async () => {
      const { data: auctionData } = await supabase
        .from('auctions')
        .select(
          'id, title, description, current_price, ends_at, status, paid, image_url, images, starts_at'
        )
        .eq('id', id)
        .single()

      setAuction(auctionData)
      setLoading(false)
    }

    loadAuction()
  }, [id])

  const loadBids = useCallback(async () => {
    if (!id) return

    const { data: bidsData, error } = await supabase
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

    const subscription = supabase
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
    if (!amount || amount <= auction!.current_price) {
      setBidError('Bid must be higher than current price')
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

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
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
            <AuctionHeader
              title={auction.title}
              currentPrice={auction.current_price}
            />

            {(auction.starts_at || auction.ends_at) && (
              <AuctionCountdown
                targetAt={countdownPhase === 'starts' ? auction.starts_at : auction.ends_at}
                phase={countdownPhase}
                timeLeft={timeLeft}
              />
            )}

            <p className="whitespace-pre-line text-gray-700 leading-relaxed">
              {auction.description || 'No description provided.'}
            </p>

            <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
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

          <BidForm
            hasEnded={hasEnded || isScheduled}
            bidAmount={bidAmount}
            isPlacingBid={isPlacingBid}
            error={bidError}
            isLoggedIn={!!userId}
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
