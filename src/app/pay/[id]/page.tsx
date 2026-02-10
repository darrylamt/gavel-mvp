'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PayPage() {
  const { id } = useParams()
  const [auction, setAuction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: auctionData } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', id)
          .single()
        
        setAuction(auctionData)
      } catch (err) {
        setError('Failed to load auction')
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [id])

  const pay = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      
      if (!auth.user || !auth.user.email) {
        setError('You must be logged in')
        return
      }

      const res = await fetch('/api/paystack/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: id,
          user_id: auth.user.id,
          email: auth.user.email,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Payment initialization failed')
        return
      }

      window.location.href = data.authorization_url
    } catch (err) {
      setError('An error occurred during payment')
    }
  }

  if (loading) return <p className="p-6">Loading auction…</p>
  
  if (!auction) {
    return <p className="p-6 text-red-500">Auction not found</p>
  }

  return (
    <main className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pay for Auction</h1>
      
      <div className="border rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">{auction.title}</h2>
        <p className="text-lg text-gray-700">Amount: GHS {auction.current_price}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <button
        onClick={pay}
        className="w-full bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        Pay with Paystack
      </button>
    </main>
  )
}
