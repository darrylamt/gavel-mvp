'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuctionDetailPage() {
  const { id } = useParams()
  const [auction, setAuction] = useState<any>(null)
  const [bids, setBids] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')


  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  // Load auction + bids
  useEffect(() => {
    if (!id) return

    const loadData = async () => {
      const { data: auctionData } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', id)
        .single()

      const { data: bidsData } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', id)
        .order('amount', { ascending: false })

      setAuction(auctionData)
      setBids(bidsData || [])
      setLoading(false)
    }

    loadData()
  }, [id])

  if (loading) {
    return <p className="p-6">Loading auction...</p>
  }

  if (!auction) {
    return <p className="p-6 text-red-500">Auction not found</p>
  }

  const hasEnded = (() => {
  if (!auction || !auction.ends_at) return false
  return (
    auction.status === 'ended' ||
    new Date(auction.ends_at).getTime() <= Date.now()
    )
  })()

  const placeBid = async () => {
  if (!auction || !userId) {
    alert('You must be logged in to bid')
    return
  }

  const res = await fetch('/api/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auction_id: auction.id,
      amount: Number(bidAmount),
      user_id: userId,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error)
    return
  }

  setBidAmount('')
}


  const isWinner =
  hasEnded &&
  Array.isArray(bids) &&
  bids.length > 0 &&
  bids[0]?.user_id === userId

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">{auction.title}</h1>

      <p className="mt-2">
        Current price: <strong>GHS {auction.current_price}</strong>
      </p>

      <p className="text-sm text-gray-500">
        Ends at: {new Date(auction.ends_at).toLocaleString()}
      </p>

      <hr className="my-4" />

      {/* AUCTION STATUS */}
      {hasEnded ? (
        <p className="text-red-600 font-bold">Auction Ended</p>
      ) : (
        <p className="text-green-600 font-bold">Auction Active</p>
      )}

      {/* WINNER MESSAGE */}
      {hasEnded && isWinner && (
        <div className="mt-4 p-4 border rounded bg-green-50">
          <p className="font-bold text-green-700">
            🎉 You won this auction
          </p>
          <p className="text-sm text-gray-600">
            Payment will be enabled next.
          </p>
        </div>
      )}

      {/* BID LIST */}
      <h2 className="mt-6 font-bold">Bids</h2>

      {bids.length === 0 ? (
        <p className="text-sm text-gray-500">No bids yet</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {bids.map((bid) => (
            <li key={bid.id} className="border p-2 rounded">
              GHS {bid.amount}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
