'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Auction = {
  id: string
  title: string
  status: string | null
  starts_at: string | null
  ends_at: string | null
  paid: boolean | null
  shipping_status: string | null
  winner_id: string | null
}

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuctions()
  }, [])

  const loadAuctions = async () => {
    const { data } = await supabase
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false })

    setAuctions(data || [])
    setLoading(false)
  }

  const deleteAuction = async (id: string) => {
    const confirmed = confirm('Delete this auction permanently?')
    if (!confirmed) return

    await supabase.from('auctions').delete().eq('id', id)

    loadAuctions()
  }

  const markDelivered = async (id: string) => {
    await supabase
      .from('auctions')
      .update({ shipping_status: 'delivered' })
      .eq('id', id)

    loadAuctions()
  }

  if (loading) {
    return <p className="p-6">Loading auctions…</p>
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin – Auctions</h1>

        <Link
          href="/admin/auctions/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          + Create Auction
        </Link>
      </div>

      <div className="space-y-4">
        {auctions.map((auction) => {
          const hasStarted =
            auction.starts_at &&
            new Date(auction.starts_at).getTime() <= Date.now()

          return (
            <div
              key={auction.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{auction.title}</p>

                <p className="text-sm text-gray-500">
                  Status: {auction.status ?? 'N/A'}
                </p>

                <p className="text-sm text-gray-500">
                  Paid: {auction.paid ? 'Yes' : 'No'}
                </p>

                <p className="text-sm text-gray-500">
                  Delivery: {auction.shipping_status ?? 'Pending'}
                </p>
              </div>

              <div className="flex gap-2">

                {/* EDIT — only if NOT started */}
                {!hasStarted && (
                  <Link
                    href={`/admin/auctions/edit/${auction.id}`}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Edit
                  </Link>
                )}

                {/* DELETE */}
                <button
                  onClick={() => deleteAuction(auction.id)}
                  className="px-3 py-1 border rounded text-sm text-red-600"
                >
                  Delete
                </button>

                {/* MARK DELIVERED */}
                {auction.paid && auction.shipping_status !== 'delivered' && (
                  <button
                    onClick={() => markDelivered(auction.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
