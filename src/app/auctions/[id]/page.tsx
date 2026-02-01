'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function AuctionDetail() {
  const { id } = useParams()
  const [auction, setAuction] = useState<any>(null)
  const [bids, setBids] = useState<any[]>([])
  const [bidAmount, setBidAmount] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
    setUserId(data.user?.id ?? null)
    })
    fetchAuction()
    fetchBids()

    const channel = supabase
      .channel('bids-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${id}`,
        },
        (payload) => {
          setBids((prev) => [payload.new, ...prev])
          setAuction((prev: any) => ({
            ...prev,
            current_price: payload.new.amount,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const fetchAuction = async () => {
    const { data } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single()

    setAuction(data)
  }

  const fetchBids = async () => {
    const { data } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', id)
      .order('created_at', { ascending: false })

    setBids(data || [])
  }

  const placeBid = async () => {
    const amount = Number(bidAmount)
    if (!auction || amount <= auction.current_price) {
      alert('Bid must be higher than current price')
      return
    }

    const { data: user } = await supabase.auth.getUser()

    await supabase.from('bids').insert({
      auction_id: id,
      user_id: user.user?.id,
      amount,
    })

    await supabase
      .from('auctions')
      .update({ current_price: amount })
      .eq('id', id)

    setBidAmount('')
  }

  if (!auction) return <p className="p-10">Loading...</p>

  return (
    <main className="p-10 max-w-xl">
      <h1 className="text-3xl font-bold">{auction.title}</h1>
      <p className="mt-2">Current Price: GHS {auction.current_price}</p>
      {new Date(auction.end_time) < new Date() && auction.status !== 'ended' && (
  <button
    onClick={async () => {
      await supabase.rpc('end_auction', { auction_uuid: id })
      location.reload()
    }}
    className="mt-4 bg-red-600 text-white p-2"
  >
    End Auction
  </button>
)}
{auction.status === 'ended' && (
  <div className="mt-6 border p-4 rounded">
    {auction.winner_id === userId ? (
      <>
        <h2 className="font-bold text-green-600">
          You won this auction 🎉
        </h2>

        {!auction.paid && (
          <a
            href={`/pay/${auction.id}`}
            className="inline-block mt-2 bg-black text-white p-2"
          >
            Pay Now
          </a>
        )}
      </>
    ) : (
      <p className="text-gray-500">Auction ended</p>
    )}
  </div>
)}

      <div className="mt-4">
        <input
          type="number"
          placeholder="Your bid (GHS)"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          className="border p-2 mr-2"
        />
        <button
          onClick={placeBid}
          className="bg-black text-white p-2"
        >
          Place Bid
        </button>
      </div>

      <h2 className="mt-6 font-bold">Bids</h2>
      <ul className="mt-2 space-y-2">
        {bids.map((bid) => (
          <li key={bid.id} className="border p-2 rounded">
            GHS {bid.amount}
          </li>
        ))}
      </ul>
    </main>
  )
}