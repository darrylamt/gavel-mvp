'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PayPage() {
  const { id } = useParams()
  const [auction, setAuction] = useState<any>(null)

  useEffect(() => {
    supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setAuction(data))
  }, [id])

  const pay = async () => {
    const res = await fetch('/api/paystack/init', {
      method: 'POST',
      body: JSON.stringify({
        auction_id: id,
        amount: auction.current_price,
      }),
    })

    const data = await res.json()
    window.location.href = data.authorization_url
  }

  if (!auction) return null

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold">Pay for Auction</h1>
      <p>Amount: GHS {auction.current_price}</p>

      <button
        onClick={pay}
        className="mt-4 bg-black text-white p-2"
      >
        Pay with Paystack
      </button>
    </main>
  )
}
