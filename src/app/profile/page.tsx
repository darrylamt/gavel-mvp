'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type WonAuction = {
  auction_id: string
  title: string
  amount: number
  paid: boolean
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number>(0)
  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------- LOAD PROFILE ---------------- */

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setLoading(false)
        return
      }

      setUserId(auth.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, token_balance')
        .eq('id', auth.user.id)
        .single()

      setUsername(profile?.username ?? null)
      setTokens(profile?.token_balance ?? 0)

      await loadWonAuctions(auth.user.id)
      setLoading(false)
    }

    loadProfile()
  }, [])

  /* ---------------- LOAD AUCTIONS WON ---------------- */

  const loadWonAuctions = async (uid: string) => {
    /**
     * Strategy:
     * 1. Get all ended auctions
     * 2. Join highest bid per auction
     * 3. Filter where highest bid.user_id === current user
     */

    const { data, error } = await supabase.rpc(
      'get_auctions_won_by_user',
      { uid }
    )

    if (error) {
      console.error('Failed to load won auctions', error)
      return
    }

    setWonAuctions(data || [])
  }

  /* ---------------- PAY NOW ---------------- */

  const payNow = async (auctionId: string, amount: number) => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user || !auth.user.email) {
      alert('You must be logged in')
      return
    }

    const res = await fetch('/api/paystack/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: auctionId,
        user_id: auth.user.id,
        email: auth.user.email,
        amount,
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

  if (loading) {
    return <p className="p-6">Loading profile…</p>
  }

  if (!userId) {
    return (
      <p className="p-6 text-sm text-gray-600">
        Please sign in to view your profile.
      </p>
    )
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10">
      {/* PROFILE HEADER */}
      <section className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold">
          {username ? username[0].toUpperCase() : 'U'}
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            {username ?? 'Anonymous'}
          </h1>
          <p className="text-sm text-gray-600">
            🪙 {tokens} tokens
          </p>
        </div>
      </section>

      {/* AUCTIONS WON */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Auctions Won
        </h2>

        {wonAuctions.length === 0 ? (
          <p className="text-sm text-gray-500">
            You haven’t won any auctions yet.
          </p>
        ) : (
          <div className="space-y-4">
            {wonAuctions.map((a) => (
              <div
                key={a.auction_id}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-gray-600">
                    Winning bid: GHS {a.amount}
                  </p>
                </div>

                {a.paid ? (
                  <span className="text-green-600 font-semibold">
                    Paid
                  </span>
                ) : (
                  <button
                    onClick={() =>
                      payNow(a.auction_id, a.amount)
                    }
                    className="bg-black text-white px-4 py-2 rounded"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
