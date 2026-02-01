'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAuctions(data || [])
      })
  }, [])

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-4">Active Auctions</h1>

      <Link href="/auctions/new" className="underline">
        Create Auction
      </Link>

      <div className="mt-6 space-y-4">
        {auctions.map((a) => (
          <div key={a.id} className="border p-4 rounded">
            <h2 className="text-xl font-bold">{a.title}</h2>
            <p>Current price: GHS {a.current_price}</p>
            <Link href={`/auctions/${a.id}`} className="underline">
              View Auction
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}