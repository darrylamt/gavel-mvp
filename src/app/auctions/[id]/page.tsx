'use client'

import { useEffect, useState } from 'react'
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

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    if (!id) return

    const load = async () => {
      const { data: auctionData } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', id)
        .single()

      const { data: bidsData } = await supabase
        .from('bids')
        .select(`
          id,
          amount,
          user_id,
          profiles ( username )
        `)
        .eq('auction_id', id)
        .order('amount', { ascending: false })

      setAuction(auctionData)
      setBids(bidsData || [])
      setLoading(false)
    }

    load()
  }, [id])

  /* ---------------- COUNTDOWN ---------------- */

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

  /* ---------------- LOGIC ---------------- */

  if (loading) return <p className="p-6">Loading auction…</p>
  if (!auction)
    return <p className="p-6 text-red-500">Auction not found</p>

  const hasEnded = auction.status === 'ended'

  const isWinner =
    hasEnded &&
    bids.length > 0 &&
    bids[0]?.user_id === userId

  const placeBid = async () => {
    if (!auction || !userId) {
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
          amount,
          user_id: userId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setBidError(data.error)
        return
      }

      setBidAmount('')
    } finally {
      setIsPlacingBid(false)
    }
  }

  /* ---------------- PAYSTACK ---------------- */

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

    if (!res.ok) {
      alert(data.error || 'Payment failed')
      return
    }

    window.location.href = data.authorization_url
  }

  /* ---------------- UI ---------------- */

  return (
    <main className="p-6 max-w-xl mx-auto">
      <AuctionHeader
        title={auction.title}
        currentPrice={auction.current_price}
      />

      <AuctionCountdown
        endsAt={auction.ends_at}
        timeLeft={timeLeft}
      />

      <hr className="my-4" />

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
