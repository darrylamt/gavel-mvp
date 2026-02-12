'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

import AuctionHeader from '@/components/auction/AuctionHeader'
import AuctionCountdown from '@/components/auction/AuctionCountdown'
import BidForm from '@/components/auction/BidForm'
import BidList from '@/components/auction/BidList'
import WinnerPanel from '@/components/auction/WinnerPanel'

export default function AuctionDetailPage() {
  const { id } = useParams()

  const [auction, setAuction] = useState<any>(null)
  const [bids, setBids] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [bidAmount, setBidAmount] = useState('')
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [bidError, setBidError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('Calculating…')

  /* Load current user */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  /* Load auction data */
  useEffect(() => {
    if (!id) return

    const loadAuction = async () => {
      const { data: auctionData } = await supabase
        .from('auctions')
        .select(`
          id,
          title,
          description,
          current_price,
          ends_at,
          status,
          paid,
          image_url,
          images
        `)
        .eq('id', id)
        .single()

      setAuction(auctionData)
      setLoading(false)
    }

    loadAuction()
  }, [id])

  /* Load and subscribe to bids in real-time */
  const loadBids = useCallback(async () => {
    if (!id) return

    const { data: bidsData, error } = await supabase
      .from('bids')
      .select(`
        id,
        amount,
        user_id,
        profiles (
          username
        )
      `)
      .eq('auction_id', id)
      .order('amount', { ascending: false })

    if (!error && bidsData) {
      setBids(bidsData)
    }
  }, [id])

  useEffect(() => {
    if (!id) return

    loadBids()

    /* Subscribe to real-time bid updates */
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
        (payload) => {
          loadBids()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [id, loadBids])

  /* Auto-end auction when time expires */
  useEffect(() => {
    if (!auction?.ends_at || auction.status === 'ended') return

    const ended =
      new Date(auction.ends_at).getTime() <= Date.now()

    if (ended) {
      supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auction.id)
        .then(() => {
          setAuction((prev: any) => ({
            ...prev,
            status: 'ended',
          }))
        })
    }
  }, [auction])

  /* Update countdown timer */
  useEffect(() => {
    if (!auction?.ends_at) return

    const tick = () => {
      const diff =
        new Date(auction.ends_at).getTime() - Date.now()

      if (diff <= 0) {
        setTimeLeft('Auction Ended')
        return
      }

      const s = Math.floor((diff / 1000) % 60)
      const m = Math.floor((diff / (1000 * 60)) % 60)
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))

      const parts = []
      if (d) parts.push(`${d}d`)
      if (h) parts.push(`${h}h`)
      if (m) parts.push(`${m}m`)
      parts.push(`${s}s`)

      setTimeLeft(parts.join(' '))
    }

    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [auction?.ends_at])

  if (loading) return <p className="p-6">Loading auction…</p>
  if (!auction)
    return <p className="p-6 text-red-500">Auction not found</p>

  const hasEnded = auction.status === 'ended'

  const isWinner =
    hasEnded &&
    bids.length > 0 &&
    bids[0]?.user_id === userId

  /* Place bid and refresh */
  const placeBid = async () => {
    if (!userId) {
      setBidError('You must be logged in')
      return
    }

    const amount = Number(bidAmount)
    if (!amount || amount <= auction.current_price) {
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
          auction_id: auction.id,
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
      /* Refresh bids after successful bid */
      await loadBids()
    } finally {
      setIsPlacingBid(false)
    }
  }

  /* Payment handler */
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
        auction_id: auction.id,
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

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      {auction.image_url && (
        <img
          src={auction.image_url}
          alt={auction.title}
          className="w-full h-96 object-cover rounded-xl border"
        />
      )}

      {Array.isArray(auction.images) && auction.images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {auction.images.map((img: string, i: number) => (
            <img
              key={i}
              src={img}
              className="h-32 w-full object-cover rounded-lg border"
            />
          ))}
        </div>
      )}

      <AuctionHeader
        title={auction.title}
        currentPrice={auction.current_price}
      />

      <AuctionCountdown
        endsAt={auction.ends_at}
        timeLeft={timeLeft}
      />

      <div className="space-y-4">
        <p className="text-gray-700">{auction.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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

      <BidForm
        hasEnded={hasEnded}
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

      <BidList bids={bids} currentUserId={userId} />
    </main>
  )
}
