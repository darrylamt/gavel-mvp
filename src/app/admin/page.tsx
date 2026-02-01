'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminDashboard() {
  const [auctions, setAuctions] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setAuctions(data || []))
  }, [])

  const endAuction = async (id: string) => {
    await fetch('/api/auctions/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auction_id: id }),
    })
    location.reload()
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin – Auctions</h1>

      <a
        href="/admin/new"
        className="inline-block mb-4 bg-black text-white px-4 py-2"
      >
        + Create Auction
      </a>

      {auctions.map((a) => (
        <div key={a.id} className="border p-4 mb-3">
          <h2 className="font-bold">{a.title}</h2>
          <p>Status: {a.status}</p>

          {a.status === 'active' && (
            <button
              onClick={() => endAuction(a.id)}
              className="mt-2 text-red-600"
            >
              End Auction
            </button>
          )}
        </div>
      ))}
    </main>
  )
}
