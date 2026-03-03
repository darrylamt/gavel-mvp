'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type Bid = {
  id: string
  auction_id: string
  user_id: string
  amount: number
  created_at: string
  auction_title?: string
  bidder_email?: string
  bidder_username?: string
}

export default function AdminBidsPage() {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadBids = async () => {
    setLoading(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/admin/bids', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (res.ok) {
        setBids(data.bids || [])
      } else {
        setError(data.error || 'Failed to load bids')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadBids()
  }, [])

  const deleteBid = async (bidId: string, auctionTitle: string) => {
    const confirmed = confirm(`Delete bid from auction "${auctionTitle}"? This action cannot be undone.`)
    if (!confirmed) return

    setBusyId(bidId)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setError('Unauthorized')
      setBusyId(null)
      return
    }

    try {
      const res = await fetch(`/api/admin/bids/${bidId}/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to delete bid')
      } else {
        await loadBids()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bid')
    } finally {
      setBusyId(null)
    }
  }

  const filteredBids = bids.filter((bid) => {
    const query = searchQuery.toLowerCase()
    return (
      !query ||
      (bid.auction_title?.toLowerCase().includes(query) ?? false) ||
      (bid.bidder_email?.toLowerCase().includes(query) ?? false) ||
      (bid.bidder_username?.toLowerCase().includes(query) ?? false) ||
      bid.id.toLowerCase().includes(query)
    )
  })

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-bold">Bids</h1>
          <p className="text-sm text-gray-600">View and delete bids from auctions</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <input
            type="text"
            placeholder="Search by auction title, email, username, or bid ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center">Loading...</div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
        ) : filteredBids.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-500">No bids found</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Auction</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Bidder</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBids.map((bid) => (
                  <tr key={bid.id} className="border-b">
                    <td className="px-4 py-3 text-sm">{bid.auction_title || bid.auction_id}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{bid.bidder_username || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{bid.bidder_email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">₵{bid.amount}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(bid.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => deleteBid(bid.id, bid.auction_title || 'Untitled')}
                        disabled={busyId === bid.id}
                        className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:bg-gray-400"
                      >
                        {busyId === bid.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
