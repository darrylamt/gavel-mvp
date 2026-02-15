'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ImageGallery from '@/components/auction/ImageGallery'
import WinnerPanel from '@/components/auction/WinnerPanel'
import ShareAuctionButton from '@/components/auction/ShareAuctionButton'

type CarSpecs = {
  titleCode?: string
  odometer?: string
  primaryDamage?: string
  cylinders?: string
  color?: string
  hasKey?: string
  engineType?: string
  transmission?: string
  vehicleType?: string
  drivetrain?: string
  fuel?: string
  saleDate?: string
  location?: string
  engineStarts?: string
  transmissionEngages?: string
}

type AuctionRecord = {
  id: string
  title: string
  description: string | null
  auction_type?: 'normal' | 'car' | null
  car_specs?: CarSpecs | null
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
}

export default function CarAuctionDetailPage() {
  const { id } = useParams()

  const [auction, setAuction] = useState<AuctionRecord | null>(null)
  const [bids, setBids] = useState<BidRecord[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [bidError, setBidError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('Calculating...')

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
  const hasEnded = auction?.status === 'ended' || (endsAtMs != null && endsAtMs <= now)

  const isWinner = hasEnded && bids.length > 0 && bids[0]?.user_id === userId

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
        .select('id, title, description, auction_type, car_specs, current_price, ends_at, status, paid, image_url, images, starts_at')
        .eq('id', id)
        .single()

      setAuction(auctionData)
      setLoading(false)
    }

    loadAuction()
  }, [id])

  const loadBids = useCallback(async () => {
    if (!id) return

    const { data: bidsData } = await supabase
      .from('bids')
      .select('id, amount, user_id')
      .eq('auction_id', id)
      .order('amount', { ascending: false })

    setBids((bidsData as BidRecord[]) || [])
  }, [id])

  useEffect(() => {
    if (!id) return
    loadBids()

    const subscription = supabase
      .channel(`bids:car:${id}`)
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
      const startsAtValue = startsAt ? new Date(startsAt).getTime() : null
      const endsAtValue = endsAt ? new Date(endsAt).getTime() : null

      if (startsAtValue != null && nowMs < startsAtValue) {
        setTimeLeft(`Starts in ${formatDuration(startsAtValue - nowMs)}`)
        return
      }

      if (endsAtValue != null && nowMs < endsAtValue) {
        setTimeLeft(`Ends in ${formatDuration(endsAtValue - nowMs)}`)
        return
      }

      setTimeLeft('Auction Ended')
    }

    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [auction?.starts_at, auction?.ends_at])

  const placeBid = async () => {
    if (!auction) return

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
    if (!amount || amount <= auction.current_price) {
      setBidError('Bid must be higher than current bid')
      return
    }

    try {
      setIsPlacingBid(true)
      setBidError(null)

      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auction.id,
          user_id: userId,
          amount,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setBidError(data.error || 'Failed to place bid')
        return
      }

      setBidAmount('')
      const { data: updatedAuction } = await supabase
        .from('auctions')
        .select('id, title, description, auction_type, car_specs, current_price, ends_at, status, paid, image_url, images, starts_at')
        .eq('id', auction.id)
        .single()
      setAuction(updatedAuction)
      await loadBids()
    } finally {
      setIsPlacingBid(false)
    }
  }

  const payNow = async () => {
    if (!auction) return

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user || !auth.user.email) {
      alert('You must be logged in')
      return
    }

    const res = await fetch('/api/paystack/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: auction.id,
        user_id: auth.user.id,
        email: auth.user.email,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.authorization_url) {
      alert(data.error || 'Payment initialization failed')
      return
    }

    window.location.href = data.authorization_url
  }

  if (loading) return <p className="p-6">Loading car auction...</p>
  if (!auction) return <p className="p-6 text-red-500">Car auction not found</p>
  if (auction.auction_type !== 'car') return <p className="p-6 text-red-500">This listing is not a car auction.</p>

  const specs = auction.car_specs
  const formattedDescription = (auction.description ?? '')
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight">{auction.title}</h1>
        <div className="flex items-center gap-2">
          <ShareAuctionButton auctionId={auction.id} />
          <Link href="/auctions/cars" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Back to cars
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1.7fr_1.2fr]">
        <div className="rounded-2xl border bg-white p-3">
          <ImageGallery
            images={
              auction.images && auction.images.length > 0
                ? auction.images
                : auction.image_url
                ? [auction.image_url]
                : []
            }
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-xl font-bold">Vehicle Details</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-gray-500">Title code</div><div>{specs?.titleCode || '-'}</div>
              <div className="text-gray-500">Odometer</div><div>{specs?.odometer || '-'}</div>
              <div className="text-gray-500">Primary damage</div><div>{specs?.primaryDamage || '-'}</div>
              <div className="text-gray-500">Cylinders</div><div>{specs?.cylinders || '-'}</div>
              <div className="text-gray-500">Color</div><div>{specs?.color || '-'}</div>
              <div className="text-gray-500">Has key</div><div>{specs?.hasKey || '-'}</div>
              <div className="text-gray-500">Engine type</div><div>{specs?.engineType || '-'}</div>
              <div className="text-gray-500">Transmission</div><div>{specs?.transmission || '-'}</div>
              <div className="text-gray-500">Vehicle type</div><div>{specs?.vehicleType || '-'}</div>
              <div className="text-gray-500">Drivetrain</div><div>{specs?.drivetrain || '-'}</div>
              <div className="text-gray-500">Fuel</div><div>{specs?.fuel || '-'}</div>
              <div className="text-gray-500">Sale date</div><div>{specs?.saleDate || '-'}</div>
              <div className="text-gray-500">Location</div><div>{specs?.location || '-'}</div>
            </div>
          </div>

          {(specs?.engineStarts || specs?.transmissionEngages) && (
            <div className="rounded-2xl border bg-white p-5">
              <h3 className="mb-3 text-lg font-semibold">Condition</h3>
              {specs?.engineStarts && <p className="mb-2 text-sm text-gray-700">• {specs.engineStarts}</p>}
              {specs?.transmissionEngages && <p className="text-sm text-gray-700">• {specs.transmissionEngages}</p>}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Current bid</p>
          <p className="mt-1 text-5xl font-extrabold text-black">GHS {auction.current_price.toLocaleString()}</p>
          <p className="mt-4 text-sm text-gray-600">Auction countdown: {timeLeft}</p>

          {isScheduled && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This auction has not started yet.
            </div>
          )}
          {hasEnded && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              This auction has ended.
            </div>
          )}

          {!hasEnded && (
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Your bid</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBidAmount(String(Math.max(0, Number(bidAmount || auction.current_price) - 1)))}
                  className="rounded-md border px-3 py-2 text-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder={String(auction.current_price)}
                  disabled={isPlacingBid || !userId}
                />
                <button
                  type="button"
                  onClick={() => setBidAmount(String(Number(bidAmount || auction.current_price) + 1))}
                  className="rounded-md border px-3 py-2 text-lg"
                >
                  +
                </button>
              </div>

              {bidError && <p className="text-sm text-red-600">{bidError}</p>}

              <button
                onClick={placeBid}
                disabled={isPlacingBid || !userId || isScheduled}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPlacingBid ? 'Placing bid...' : 'Bid now'}
              </button>

              {!userId && <p className="text-xs text-gray-500">Sign in to place a bid.</p>}
            </div>
          )}

          <WinnerPanel hasEnded={hasEnded} isWinner={isWinner} paid={auction.paid} onPay={payNow} />
        </aside>
      </div>

      <div className="mt-8 rounded-xl border bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold">Description</h2>
        <p className="whitespace-pre-line text-gray-700">{formattedDescription || 'No description provided.'}</p>
      </div>
    </main>
  )
}
