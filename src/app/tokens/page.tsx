'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const PACKS = [
  {
    id: 'small',
    tokens: 10,
    price: 10,
    label: 'Starter',
    highlight: false,
  },
  {
    id: 'medium',
    tokens: 50,
    price: 45,
    label: 'Most Popular',
    highlight: true,
  },
  {
    id: 'large',
    tokens: 100,
    price: 80,
    label: 'Best Value',
    highlight: false,
  },
]

export default function BuyTokensPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const buyTokens = async (packId: string) => {
    setLoading(packId)

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      alert('Please sign in to buy tokens')
      setLoading(null)
      return
    }

    const res = await fetch('/api/tokens/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pack: packId,
        user_id: auth.user.id,
        email: auth.user.email,
      }),
    })

    const data = await res.json()

    if (res.ok) {
      window.location.href = data.authorization_url
    } else {
      alert(data.error || 'Payment failed')
      setLoading(null)
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      {/* HEADER */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <h1 className="text-3xl font-extrabold mb-3">
          Buy Tokens
        </h1>
        <p className="text-gray-600">
          Tokens are used to place bids on auctions.
          More tokens means more chances to win.
        </p>
      </div>

      {/* PACKS */}
      <div className="grid md:grid-cols-3 gap-6">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`relative rounded-2xl border p-6 flex flex-col ${
              pack.highlight
                ? 'border-black shadow-lg'
                : 'border-gray-200'
            }`}
          >
            {pack.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded-full">
                Most Popular
              </span>
            )}

            <h2 className="text-xl font-bold mb-2">
              {pack.label}
            </h2>

            <div className="text-4xl font-extrabold mb-1">
              {pack.tokens}
              <span className="text-base font-medium text-gray-500">
                {' '}tokens
              </span>
            </div>

            <p className="text-gray-600 mb-6">
              GHS {pack.price}
            </p>

            <button
              onClick={() => buyTokens(pack.id)}
              disabled={loading === pack.id}
              className={`mt-auto w-full py-3 rounded-xl font-semibold transition ${
                pack.highlight
                  ? 'bg-black text-white hover:bg-gray-900'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {loading === pack.id
                ? 'Redirecting…'
                : 'Buy Tokens'}
            </button>
          </div>
        ))}
      </div>

      {/* FOOTER INFO */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>Payments are securely processed by Paystack.</p>
        <p className="mt-1">
          Tokens are non-refundable once purchased.
        </p>
      </div>
    </main>
  )
}
